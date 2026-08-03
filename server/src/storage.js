import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config.js';

const safeKey = value => String(value || '').replace(/[^A-Za-z0-9._/-]/g, '_').replace(/^\/+/, '');

class FilesystemStorage {
  constructor(root) {
    this.provider = 'filesystem';
    this.root = root;
    fs.mkdirSync(root, { recursive: true });
  }
  resolve(key) {
    const clean = safeKey(key);
    const target = path.resolve(this.root, clean);
    const root = path.resolve(this.root) + path.sep;
    if (!target.startsWith(root)) throw new Error('不正な保存キーです。');
    return target;
  }
  async put(key, buffer) {
    const target = this.resolve(key);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, buffer, { flag:'wx' });
    return { provider:this.provider, key:safeKey(key), size:buffer.length };
  }
  async get(key) { return fs.promises.readFile(this.resolve(key)); }
  async delete(key) { await fs.promises.rm(this.resolve(key), { force:true }); }
  async exists(key) { try { await fs.promises.access(this.resolve(key), fs.constants.R_OK); return true; } catch { return false; } }
}

class S3Storage {
  constructor(options) {
    this.provider = 's3';
    this.options = options;
    this.clientPromise = null;
  }
  async client() {
    if (!this.clientPromise) {
      this.clientPromise = import('@aws-sdk/client-s3').then(({S3Client}) => new S3Client({
        region:this.options.region,
        endpoint:this.options.endpoint || undefined,
        forcePathStyle:Boolean(this.options.forcePathStyle),
        credentials:this.options.accessKeyId ? {accessKeyId:this.options.accessKeyId,secretAccessKey:this.options.secretAccessKey} : undefined
      }));
    }
    return this.clientPromise;
  }
  fullKey(key) { return [this.options.prefix, safeKey(key)].filter(Boolean).join('/'); }
  async put(key, buffer, metadata={}) {
    const {PutObjectCommand}=await import('@aws-sdk/client-s3');
    const client=await this.client();
    await client.send(new PutObjectCommand({Bucket:this.options.bucket,Key:this.fullKey(key),Body:buffer,ContentType:metadata.contentType,Metadata:metadata.sha256?{sha256:metadata.sha256}:undefined,ServerSideEncryption:this.options.sse || undefined}));
    return {provider:this.provider,key:safeKey(key),size:buffer.length};
  }
  async get(key) {
    const {GetObjectCommand}=await import('@aws-sdk/client-s3');
    const client=await this.client();
    const response=await client.send(new GetObjectCommand({Bucket:this.options.bucket,Key:this.fullKey(key)}));
    return Buffer.from(await response.Body.transformToByteArray());
  }
  async delete(key) {
    const {DeleteObjectCommand}=await import('@aws-sdk/client-s3');
    const client=await this.client();
    await client.send(new DeleteObjectCommand({Bucket:this.options.bucket,Key:this.fullKey(key)}));
  }
  async exists(key) {
    const {HeadObjectCommand}=await import('@aws-sdk/client-s3');
    const client=await this.client();
    try { await client.send(new HeadObjectCommand({Bucket:this.options.bucket,Key:this.fullKey(key)})); return true; } catch (error) { if (error?.$metadata?.httpStatusCode===404 || error?.name==='NotFound') return false; throw error; }
  }
}

function buildStorage() {
  if (config.storage.provider === 's3') {
    if (!config.storage.s3.bucket) throw new Error('STORAGE_PROVIDER=s3 の場合は S3_BUCKET が必要です。');
    return new S3Storage(config.storage.s3);
  }
  return new FilesystemStorage(config.storage.localDir);
}

export const objectStorage = buildStorage();
export const createStorageKey = (scope, extension='') => `${safeKey(scope)}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}${extension}`;
