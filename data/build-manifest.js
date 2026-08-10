window.SK_BUILD_MANIFEST = {
  version: "v1.3.81",
  part: 593,
  legacyDevelopmentBase: "part593",
  baseRelease: "v1.3.80",
  buildId: "2026-08-10-skdg-v1.3.81-three-state-reference-assessment",
  releasedAt: "2026-08-10T09:39:00+09:00",
  dataVersion: "dangerous-goods-2026-08-03",
  legalMasterVersion: "part503",
  expectedRecordCount: 2725,
  expectedUniqueUnCount: 2248,
  minorRelease: true,
  displayVersion: "Version 1.0 試作版",
  prototypeStage: true,
  ctuAssessmentV1381: { labels:['参考上十分','要確認','参考上不足'], unresolvedIsNotFinalFailure:true, confirmedOnlyCredit:true, baseLogic:'v1.3.80' },
  preservedModules: { dangerousGoodsSearch:true, dangerousGoodsDetail:true, regulations:true, references:true, codeScreens:true, overpackTool:true, searchHistory:true },
  applicationManagementV1315: {
    cardShowsRegisteredContentTypes:true,
    sourceTitleHiddenOnCards:true,
    directCtuButtonRemoved:true,
    detailIsSingleEntryPoint:true,
    verificationResultVisibleInDetail:true,
    ctuResultVisibleInDetail:true,
    perCaseDelete:true,
    linkedResultsDeletedWithCase:true,
    relatedPhotosSoftDeletedWithCase:true,
    relatedDocumentsCancelledWithCase:true
  },
  applicationRegistrationV1317: {
    intakeRegistrationStyleUnifiedWithCtu:true,
    intakeReviewerOptional:true,
    intakeReviewerMayBeBlank:true,
    verificationResultSavedSeparately:true,
    sameOfficialApplicationNumberReusesExistingCase:true,
    ctuAndVerificationCanShareApplicationNumber:true,
    sameCaseCardShowsBothRegistrationTypes:true,
    detailTabsSeparateVerificationAndCtu:true,
    duplicateApplicationCardNotCreated:true,
    noDatabaseMigration:true
  },
  ctuRegistrationV1316: {
    registrationButtonAlwaysClickable:true,
    finalReviewCheckboxRemoved:true,
    reviewerNotRequiredForRegistration:true,
    registrationWithoutReviewCheck:true,
    reviewStateStoredAsNotRequired:true,
    nextCalcButtonRemoved:true,
    easyOperationGuideRemoved:true,
    noPageWideMutationObserver:true
  },
  ctuPhotoAssist: {
    automaticAfterPhotoDecode:true,
    duplicateAiPanelsRemoved:true,
    allQuickFieldsRemainEditable:true,
    steelBandCandidateForThinBlackFlatBand:true,
    noProductBrandInferenceFromPhoto:true,
    lashingCountEstimate:true,
    projectedAngleEstimate:true,
    timberSupportEstimate:true,
    mslNeverGuessedFromAppearance:true
  },
  containerReference: {
    genericContainerDefault:"20FT dry",
    selectorVisibleOnlyForGenericContainer:true,
    dry20:true,dry40:true,reefer20:true,reefer40:true,
    cargoDimensionFitAssist:true,
    photoCargoLengthWidthHeightCandidates:true,
    photoDimensionConfidence:"low-single-image",
    photoReferenceUsesContainerInnerWidthFirst:true,
    photoMeasuredLengthAiCandidate:true,
    fitResultTextHidden:true,
    genericContainerDefaultLabelHidden:true,
    actualEquipmentSpecificationTakesPriority:true
  },
  sourceJump: {
    ctuTransportPdfPage:17,
    ctuSeaAreaDefinitionPdfPage:17,
    ctuSeaAreaGeographyPdfPage:18,
    ctuDirectFrictionPdfPage:81,
    ctuMslPdfPage:85,
    ctuWebbingPdfPage:86,
    ctuDirectLashingPdfPage:98,
    ctuFrictionPdfPage:109,
    ctuFrictionConditionsPdfPage:110,
    cssAnnex13Table1PdfPage:3,
    cssAnnex13Source:"MSC.1/Circ.1623 / Part478 verified source mapping",
    seaAreaABCUsesCtuCodeChapter5:true,
    cssDoesNotDefineCtuSeaAreaABC:true,
    attachmentPointWeakestLinkUsesCtuAndCss:true,
    adoptedMslWeakestLinkUsesCtuAndCss:true,
    onlyDirectlyRelevantRowsHaveJumpButton:true,
    bulkSourceSummaryRemoved:true
  },
  caseEntry: { newCaseTitleBlank:true, excelCargoNameDoesNotPopulateCaseTitle:true },
  criticalAssets: {
    "assets/js/v1315-application-management.js":"v1.3.24",
    "assets/js/v1315-application-detail.js":"v1.3.17",
    "assets/js/v1316-ctu-cleanup.js":"v1.3.24",
    "assets/css/v1316-ctu-cleanup.css":"v1.3.17",
    "assets/js/application-result-link.js":"v1.3.17",
    "assets/js/v137-ctu-usability.js":"v1.3.14",
    "assets/js/v141-photo-ai-container-fit.js":"v1.3.13",
    "assets/js/v142-ctu-ai-assist.js":"v1.3.13",
    "assets/css/v142-ctu-cleanup.css":"v1.3.13",
    "assets/js/version-guard.js":"v1.3.9",
    "assets/js/application-intake-workflow.js":"v1.3.24",
    "assets/js/v1317-intake-registration.js":"v1.3.23",
    "assets/css/v1317-intake-registration.css":"v1.3.23",
    "assets/css/login-production.css":"v1.3.20"
  },
  performanceV1325: {
    applicationListIndexedByApplicationId:true,
    photoDocumentResultCountsIndexed:true,
    sheetJsLoadedOnlyForExcelImport:true,
    ctuPostInteractionCleanupLightweight:true,
    databaseMigration:false
  }
};

// v1.3.17 login illustration restore
window.SK_BUILD_MANIFEST_V1317=Object.assign(window.SK_BUILD_MANIFEST_V1317||{},{loginIllustrationRestored:true,timeAwarePortBackgroundRestored:false});

// v1.3.18 login illustration stacking fix
window.SK_BUILD_MANIFEST_V1318=Object.assign(window.SK_BUILD_MANIFEST_V1318||{},{loginIllustrationVisibleLayer:true,negativeZIndexRemoved:true,timeAwareFourBackgrounds:false,legacyIllustrationFallback:false,fileSchemeCompatible:true});

// v1.3.19 exact legacy login background restore
window.SK_BUILD_MANIFEST_V1319=Object.assign(window.SK_BUILD_MANIFEST_V1319||{},{exactLegacyBusinessBackgroundRestored:true,staticLoginBackground:true,timeAwareBackgroundDisabled:true,fileSchemeCompatible:true});

// v1.3.20 exact single login background
window.SK_BUILD_MANIFEST_V1320=Object.assign(window.SK_BUILD_MANIFEST_V1320||{},{exactUserApprovedLoginBackground:true,staticSingleBackground:true,timeAwareBackgroundReferencesRemoved:true,darkPortBackgroundReferencesRemoved:true,fallbackBackgroundRemoved:true,fileSchemeCompatible:true});

// v1.3.21 application-intake registration number entry
window.SK_BUILD_MANIFEST_V1321=Object.assign(window.SK_BUILD_MANIFEST_V1321||{},{intakeRegistrationNumberEntry:true,intakeRegistrationYearEntry:true,intakeRegistrationCaseTitleOptional:true,registrationNumberMayOverrideImportedCandidate:true,sameOfficialNumberReusesExistingCase:true,verificationAndCtuShareSameCaseCard:true,noDatabaseMigration:true});

// v1.3.22 registration UI + detail labels
window.SK_BUILD_MANIFEST_V1322=Object.assign(window.SK_BUILD_MANIFEST_V1322||{},{applicationCardDetailLabelAlwaysVisible:true,intakeLegacyBlankButtonsForcedHidden:true,intakeRegistrationUiMatchesCtu:true,intakeRegistrationTargetCompact:true,intakeSingleRegistrationAction:true,sameOfficialNumberReusesExistingCase:true,noDatabaseMigration:true});

// v1.3.23 application registration fields are static; no details/summary toggle marker.

// v1.3.24 performance hotfix
window.SK_BUILD_MANIFEST_V1324=Object.assign(window.SK_BUILD_MANIFEST_V1324||{},{applicationManagementSnapshotReads:true,applicationManagementDebouncedEnhance:true,ctuCleanupReducedDomRescans:true,intakeLazySheetJs:true,noDatabaseMigration:true});

// v1.3.25 performance hotfix stage 2
window.SK_BUILD_MANIFEST_V1325=Object.assign(window.SK_BUILD_MANIFEST_V1325||{},{applicationIdIndexes:true,sheetJsTrueLazyLoad:true,ctuLightweightPostInteractionCleanup:true,noDatabaseMigration:true});

// v1.3.26 performance hotfix stage 3
window.SK_BUILD_MANIFEST_V1326=Object.assign(window.SK_BUILD_MANIFEST_V1326||{},{applicationManagementPersistentSnapshotCache:true,searchTypingAvoidsStorageReload:true,ctuInitialFullDomCleanupOnce:true,ctuSheetJsAsync:true,ctuOffscreenRenderingDeferred:true,noDatabaseMigration:true});

// v1.3.27 performance hotfix stage 4
window.SK_BUILD_MANIFEST_V1327=Object.assign(window.SK_BUILD_MANIFEST_V1327||{},{ctuApplicationListCache:true,ctuMslPointRegistryLazyInit:true,ctuDeferredInitialCalculation:true,ctuDeferredCaseListRendering:true,ctuMoreOffscreenPanelsDeferred:true,noDatabaseMigration:true});

// v1.3.28 performance hotfix stage 5
window.SK_BUILD_MANIFEST_V1328=Object.assign(window.SK_BUILD_MANIFEST_V1328||{},{ctuLegacyEnhancementScriptsDeferred:true,legacyScriptExecutionOrderPreserved:true,initialHtmlParsingLessBlocked:true,heicConverterLoadingBehaviorPreserved:true,noDatabaseMigration:true});

// v1.3.29 performance hotfix stage 6
window.SK_BUILD_MANIFEST_V1329=Object.assign(window.SK_BUILD_MANIFEST_V1329||{},{applicationQuickPanelCacheReuse:true,applicationDeleteUsesIdIndexes:true,ctuMaterialComparisonLazyRender:true,noDatabaseMigration:true});

// v1.3.30 privileged menu/access gate
window.SK_BUILD_MANIFEST_V1330=Object.assign(window.SK_BUILD_MANIFEST_V1330||{},{overpackPrivilegedRoles:["safety-environment-director","safety-environment-staff","safety-environment-admin","validator"],systemSettingsPrivilegedRoles:["safety-environment-director","safety-environment-staff","safety-environment-admin","validator"],mainMenuAndSubmenuUnified:true,directUrlGuard:true,overpackOfficeRestrictionBypassedForPrivilegedRoles:true,noDatabaseMigration:true});

// v1.3.31 current-user header / user-settings shortcut
window.SK_BUILD_MANIFEST_V1331=Object.assign(window.SK_BUILD_MANIFEST_V1331||{},{currentUserDisplayNameInHeader:true,dangerousGoodsDetailUserName:true,dangerousGoodsSearchUserName:true,appHeaderUserShortcut:true,userHeaderLinksToSettings:true,userAvatarUsesNameInitial:true,v1330PermissionGatePreserved:true,noDatabaseMigration:true});

// v1.3.32 primary feature header consistency
window.SK_BUILD_MANIFEST_V1332=Object.assign(window.SK_BUILD_MANIFEST_V1332||{},{primaryFeatureHomeButtonUnified:true,dangerousGoodsSearchHomeButton:true,dangerousGoodsDetailHomeButton:true,ctuSharedHeader:true,feedbackHistoryIconUnified:true,currentUserHeaderPreserved:true,noDatabaseMigration:true});

// v1.3.33 static header polish / flash reduction
window.SK_BUILD_MANIFEST_V1333=Object.assign(window.SK_BUILD_MANIFEST_V1333||{},{primaryFeatureHeadersStatic:true,homeButtonUsesSharedSvg:true,ctuDuplicateHomeLinkRemoved:true,mainFeatureHeaderCssLoadedInHead:true,relatedRegulationsReferencesOverpackSettingsUseSharedHeaderRule:true,v1330PermissionGatePreserved:true,v1331UserHeaderPreserved:true,noDatabaseMigration:true});


// v1.3.34 closed-by-default submenu + lightweight header runtime
window.SK_BUILD_MANIFEST_V1334=Object.assign(window.SK_BUILD_MANIFEST_V1334||{},{submenuClosedByDefault:true,submenuOpensOnlyOnMenuButton:true,applicationManagementStyleHeaderRestored:true,headerLeftAlignedMenuHomeTitle:true,currentUserAtHeaderRight:true,legacyUnifiedSubmenuRuntimeRemovedFromPrimaryPages:true,fullDomMutationObserverRemoved:true,quarterSecondRolePollingRemoved:true,roleGateRunsOnInitialLoadAndPageShow:true,noDatabaseMigration:true});

// v1.3.58 CTU global sea-area coverage + overall audit
window.SK_BUILD_MANIFEST_V1358=Object.assign(window.SK_BUILD_MANIFEST_V1358||{},{ctuGlobalSeaAreaCoverage:true,seaAreaCandidates:["seaA","seaB","seaC"],unknownPortDefaultsToSeaBAndRequiresConfirmation:true,excelPortMonthRouteTransportCoefficientLinked:true,ctuIndependentCardsOneToSix:true,ctuCardSpacingPolished:true,falseRegistrationSuccessGuard:true,noDatabaseMigration:true});

// v1.3.59 CTU six-step status + independent card visual hotfix
window.SK_BUILD_MANIFEST_V1359=Object.assign(window.SK_BUILD_MANIFEST_V1359||{},{ctuSixStepStatus:true,ctuStatusSteps:[1,2,3,4,5,6],ctuIndependentCardFrames:true,ctuLegacySharedDeckFrameDisabled:true,ctuStepNumberAlwaysVisible:true,ctuCompletionCheckmarkSecondary:true,ctuMissingDetailIncludesStepNumber:true,noDatabaseMigration:true});

// v1.3.64 CTU ghost frame root-cause fix
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {
  "assets/css/v1364-ctu-canonical-layout.css":"v1.3.64",
  "assets/js/v1364-ctu-ghost-card-cleanup.js":"v1.3.64"
});

// v1.3.72 CTU canonical runtime / legacy layout mutator retirement
window.SK_BUILD_MANIFEST_V1372=Object.assign(window.SK_BUILD_MANIFEST_V1372||{},{ctuCanonicalSixStep:true,legacyCtuLayoutMutatorsRetired:true,stickyTrackerFlatOuterShell:true,quickMethodDirectAndTopover:true,calculationCoreUnchanged:true,noDatabaseMigration:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {"assets/js/v1372-ctu-canonical-guard.js":"v1.3.73","assets/css/v1372-ctu-canonical-final.css":"v1.3.73"});

// v1.3.78 system-wide mobile readability audit
window.SK_BUILD_MANIFEST_V1378=Object.assign(window.SK_BUILD_MANIFEST_V1378||{},{mobileSystemReadabilityAudit:true,ctuMobileStatusCompact:true,applicationVerificationMobileCards:true,applicationManagementMobileSingleColumn:true,dangerousGoodsMobileAudit:true,regulationsReferencesSettingsMobileAudit:true,desktopLayoutPreserved:true,calculationLogicUnchanged:true,noDatabaseMigration:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {"assets/css/v1378-mobile-system-audit.css":"v1.3.78"});
// v1.3.79 CTU lashing material / MSL linkage
window.SK_BUILD_MANIFEST_V1379=Object.assign(window.SK_BUILD_MANIFEST_V1379||{},{ctuMaterialMslAutoLink:true,ctuAdoptedMslSummary:true,ctuSideMslPrimaryReview:true,weakestLinkMslRulePreserved:true,staleMslCarryoverPrevented:true,topoverMslStfSeparation:true,noDatabaseMigration:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {"assets/js/v1379-ctu-msl-material-linkage.js":"v1.3.79","assets/css/v1379-ctu-msl-material-linkage.css":"v1.3.79"});

// v1.3.80 CTU/CSS directional-load and resistance logic re-audit
window.SK_BUILD_MANIFEST_V1380=Object.assign(window.SK_BUILD_MANIFEST_V1380||{},{ctuDirectionalLoadReaudit:true,ctuSeaAreaABCIndependentDirectionCases:true,noFortySixtyMassSplit:true,ctuDirectFrictionUsesSeventyFivePercentStaticMu:true,ctuBoundaryRequiresConfirmedLoadTransfer:true,bracingWallDoubleCountPrevented:true,stiffMechanicalPathPriority:true,directMslRequiresAllThreeElements:true,cssDirectMslRequiresAllThreeElements:true,cssShipSpecificAccelerationPreserved:true,cssAnnex13Table2Verified:true,cssAnnex13Table3Verified:true,cssAnnex13Table4Verified:true,cssAnnex13Table5Verified:true,cssServiceSpeedBelow15NotClamped:true,cssReducedOperationalSpeedNotUsedForTransverseReduction:true,annex7_4_1_6ParallelSumBlocked:true,approvedModeNoSimpleAddition:true,noDatabaseMigration:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {"data/ctu-code-rules-v1380.js":"v1.3.80","assets/js/ctu-securing-calculator-core-v1380.js":"v1.3.80","assets/css/v1380-ctu-resistance-logic-audit.css":"v1.3.80"});

// v1.3.81 three-state reference assessment
window.SK_BUILD_MANIFEST.ctuAssessmentV1381 = {labels:['参考上十分','要確認','参考上不足'],unresolvedIsNotFinalFailure:true,confirmedOnlyCredit:true,baseLogic:'v1.3.80'};
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {"data/ctu-assessment-policy-v1381.js":"v1.3.81","assets/js/ctu-securing-calculator-core-v1381.js":"v1.3.81","assets/css/v1381-ctu-three-state-assessment.css":"v1.3.81"});
// v1.3.83 CTU photo drop visibility / bridge hotfix
window.SK_BUILD_MANIFEST_V1383=Object.assign(window.SK_BUILD_MANIFEST_V1382||{},{ctuPhotoDropOverlayReadable:true,ctuPhotoDropOverlayAbsolute:true,ctuPhotoDropBridgeRestored:true,ctuMslEvidenceDropBridge:true,ctuPointPhotoDropBridge:true,calculationLogicUnchanged:true,noDatabaseMigration:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {"assets/css/v1382-ctu-photo-drop-visibility.css":"v1.3.83","assets/js/v1382-ctu-photo-drop-bridge.js":"v1.3.83"});

;window.SKDG_BUILD_EXTENSIONS=window.SKDG_BUILD_EXTENSIONS||[];window.SKDG_BUILD_EXTENSIONS.push({version:"v1.3.84",build:"1384",feature:"ctu-combined-always-stacked"});

;window.SKDG_BUILD_EXTENSIONS=window.SKDG_BUILD_EXTENSIONS||[];window.SKDG_BUILD_EXTENSIONS.push({version:"v1.3.85",build:"1385",feature:"ctu-dual-use-checkbox",bothPanelsAlwaysVisible:true,defaultBothChecked:true,checkedOnlyCalculation:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {
  "assets/css/v1385-ctu-dual-use-checkbox.css":"v1.3.85",
  "assets/js/v1385-ctu-dual-use-toggle.js":"v1.3.85",
  "assets/js/ctu-securing-calculator-core-v1385.js":"v1.3.85",
  "assets/js/v1385-ctu-case-restore.js":"v1.3.85",
  "assets/js/v1385-ctu-sticky-status.js":"v1.3.85"
});

;window.__SK_BUILD_EXTENSIONS__=Object.assign(window.__SK_BUILD_EXTENSIONS__||{}, {
  v1387:{version:"v1.3.87",base:"v1.3.85",summary:"CTU Step 5の併用確認・長文説明ボックスを画面から撤去。固縛材/支保材の使用チェックと二重計上防止ロジックは維持。"}
});

window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-workflow-policy.js':'v1.3.88','pages/application-intake-workflow.html':'v1.3.88'});

;window.SKDG_BUILD_EXTENSIONS=window.SKDG_BUILD_EXTENSIONS||[];window.SKDG_BUILD_EXTENSIONS.push({version:'v1.3.89',build:'1389',feature:'application-intake-remark-weight-autofill',exactUnMatch:true,remarkDecimalWeightPriority:true,perPackageDerivedFromCount:true,noDatabaseMigration:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-workflow-policy.js':'v1.3.89','pages/application-intake-workflow.html':'v1.3.89'});

;window.SKDG_BUILD_EXTENSIONS=window.SKDG_BUILD_EXTENSIONS||[];window.SKDG_BUILD_EXTENSIONS.push({version:'v1.3.90',build:'1390',feature:'ctu-imported-application-number-registration-link',importedApplicationNumberAutoLink:true,existingApplicationReuse:true,registrationIdentityConsistencyCheck:true,manualFallbackWhenNoImportedIdentity:true,noDatabaseMigration:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {
  'assets/js/ctu-excel-route-import.js':'v1.3.90',
  'assets/js/v1390-ctu-application-number-registration-link.js':'v1.3.90',
  'assets/css/v1390-ctu-application-number-registration-link.css':'v1.3.90',
  'pages/ctu-securing-calculator.html':'v1.3.90'
});

window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-excel-route-import.js':'v1.3.91','assets/js/v1391-ctu-application-number-registration-link.js':'v1.3.91'});
