(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const stage=$('photoStage');
  const mainInput=$('photoInput');
  const cameraInput=$('cameraInput');
  const canvas=$('photoCanvas');
  const queue=$('part542PhotoQueue');
  if(!stage||!mainInput)return;

  const accepted=file=>{
    if(!file)return false;
    const type=String(file.type||'').toLowerCase();
    const name=String(file.name||'').toLowerCase();
    return type.startsWith('image/')||/\.(jpe?g|png|webp|heic|heif)$/i.test(name);
  };

  const saved=[];
  let forwarding=false;
  const key=file=>[file.name,file.size,file.lastModified].join(':');
  const addFiles=files=>{
    [...(files||[])].filter(accepted).forEach(file=>{
      if(saved.some(row=>key(row)===key(file)))return;
      if(saved.length<12)saved.push(file);
    });
    renderQueue();
  };

  function forwardToInput(input,files){
    const list=[...(files||[])].filter(accepted);
    if(!input||!list.length)return false;
    try{
      const dt=new DataTransfer();
      list.forEach(file=>dt.items.add(file));
      forwarding=true;
      input.files=dt.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
      queueMicrotask(()=>{forwarding=false});
      return true;
    }catch(error){
      console.warn('[SKDG v1.3.82] Drop forwarding is unavailable in this browser.',error);
      forwarding=false;
      return false;
    }
  }

  function renderQueue(){
    if(!queue)return;
    if(!saved.length){
      queue.innerHTML='<p>写真一覧はまだありません。</p>';
      return;
    }
    const ul=document.createElement('ul');
    ul.className='v1382-photo-queue-list';
    saved.forEach((file,index)=>{
      const li=document.createElement('li');
      const button=document.createElement('button');
      button.type='button';
      button.className='v1382-photo-queue-btn';
      button.dataset.v1382PhotoIndex=String(index);
      button.title=`${file.name} を表示`;
      button.textContent=`${index+1}. ${file.name}`;
      li.appendChild(button);
      ul.appendChild(li);
    });
    queue.replaceChildren(ul);
  }

  function setDragState(element,on){
    element?.classList.toggle('is-dragover',Boolean(on));
  }

  ['dragenter','dragover'].forEach(name=>stage.addEventListener(name,event=>{
    event.preventDefault();
    if(event.dataTransfer)event.dataTransfer.dropEffect='copy';
    setDragState(stage,true);
  }));
  ['dragleave','dragend'].forEach(name=>stage.addEventListener(name,event=>{
    event.preventDefault();
    setDragState(stage,false);
  }));
  stage.addEventListener('drop',event=>{
    event.preventDefault();
    setDragState(stage,false);
    const files=[...(event.dataTransfer?.files||[])].filter(accepted);
    if(!files.length)return;
    addFiles(files);
    forwardToInput(mainInput,[files[0]]);
  });
  stage.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      mainInput.click();
    }
  });

  mainInput.addEventListener('change',event=>{
    if(forwarding)return;
    addFiles(event.target.files);
  });
  cameraInput?.addEventListener('change',event=>{
    if(forwarding)return;
    addFiles(event.target.files);
  });
  queue?.addEventListener('click',event=>{
    const button=event.target.closest('[data-v1382-photo-index]');
    if(!button)return;
    const file=saved[Number(button.dataset.v1382PhotoIndex)];
    if(file)forwardToInput(mainInput,[file]);
  });

  const pairDrop=(selector,inputId,multiple=false)=>{
    const element=document.querySelector(selector),input=$(inputId);
    if(!element||!input)return;
    ['dragenter','dragover'].forEach(name=>element.addEventListener(name,event=>{
      event.preventDefault();
      event.stopPropagation();
      if(event.dataTransfer)event.dataTransfer.dropEffect='copy';
      setDragState(element,true);
    }));
    ['dragleave','dragend'].forEach(name=>element.addEventListener(name,event=>{
      event.preventDefault();
      setDragState(element,false);
    }));
    element.addEventListener('drop',event=>{
      event.preventDefault();
      event.stopPropagation();
      setDragState(element,false);
      const files=[...(event.dataTransfer?.files||[])].filter(accepted);
      if(!files.length)return;
      forwardToInput(input,multiple?files:[files[0]]);
    });
  };

  pairDrop('[data-part542-drop="msl-cargo"]','quickCargoMslPhotoInput');
  pairDrop('[data-part542-drop="msl-ctu"]','quickCtuMslPhotoInput');
  pairDrop('[data-part542-drop="msl-points"]','mslPointPhotoInput',true);

  const syncCanvasState=()=>stage.classList.toggle('has-photo',Boolean(canvas&&!canvas.hidden));
  if(canvas){
    new MutationObserver(syncCanvasState).observe(canvas,{attributes:true,attributeFilter:['hidden']});
    syncCanvasState();
  }

  renderQueue();
})();
