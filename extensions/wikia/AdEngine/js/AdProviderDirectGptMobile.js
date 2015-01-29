/*global define*/
define('ext.wikia.adEngine.provider.directGptMobile', [
	'wikia.log',
	'wikia.document',
	'ext.wikia.adEngine.wikiaGptHelper',
	'ext.wikia.adEngine.gptSlotConfig'
], function (log, document, wikiaGpt, gptSlotConfig) {
	'use strict';

	var logGroup = 'ext.wikia.adEngine.provider.directGptMobile',
		srcName = 'mobile',
		slotMap = gptSlotConfig.getConfig(srcName);

	function canHandleSlot(slotname) {
		return !!slotMap[slotname];
	}

	function fillInSlot(slotname, success, hop) {
		log(['fillInSlot', slotname], 'debug', logGroup);

		function showAdAndCallSuccess() {
			document.getElementById(slotname).className += ' show';
			success();
		}

		function doHop() {
			hop({method: 'hop'});
		}

		wikiaGpt.pushAd(slotname, showAdAndCallSuccess, doHop, srcName);
		wikiaGpt.flushAds();
	}

	wikiaGpt.defineSlots('wikia', gptSlotConfig.getConfig(srcName), srcName);

	return {
		name: 'DirectGptMobile',
		fillInSlot: fillInSlot,
		canHandleSlot: canHandleSlot
	};
});
