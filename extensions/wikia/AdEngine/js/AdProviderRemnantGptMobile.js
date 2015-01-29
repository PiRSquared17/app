/*global define*/
define('ext.wikia.adEngine.provider.remnantGptMobile', [
	'wikia.log',
	'wikia.document',
	'ext.wikia.adEngine.slotTweaker',
	'ext.wikia.adEngine.wikiaGptHelper',
	'ext.wikia.adEngine.gptSlotConfig'
], function (log, document, slotTweaker, wikiaGpt, gptSlotConfig) {
	'use strict';

	var logGroup = 'ext.wikia.adEngine.provider.remnantGptMobile',
		srcName = 'mobile_remnant',
		slotMap = gptSlotConfig.getConfig(srcName);

	function canHandleSlot(slotname) {
		return !!slotMap[slotname];
	}

	function fillInSlot(slotname, success, hop) {
		log(['fillInSlot', slotname], 5, logGroup);

		function hopToNull() {
			hop({method: 'hop'});
		}

		function showAdAndCallSuccess() {
			document.getElementById(slotname).className += ' show';
			success();
		}

		wikiaGpt.pushAd(slotname, showAdAndCallSuccess, hopToNull, srcName);
		wikiaGpt.flushAds();
	}

	wikiaGpt.defineSlots('wikia', gptSlotConfig.getConfig(srcName), srcName);

	return {
		name: 'RemnantGptMobile',
		canHandleSlot: canHandleSlot,
		fillInSlot: fillInSlot
	};
});
