/*global define*/
define('ext.wikia.adEngine.provider.directGptMaps', [
	'wikia.log',
	'ext.wikia.adEngine.gptSlotConfig',
	'ext.wikia.adEngine.wikiaGptHelper'
], function (log, slotMapConfig, wikiaGpt) {
	'use strict';

	var logGroup = 'ext.wikia.adEngine.provider.directGptMobile',
		srcName = 'maps';

	function fillInSlot(slotname, success, hop) {
		log(['fillInSlot', slotname], 'debug', logGroup);

		wikiaGpt.pushAd(slotname, success, hop, srcName);
		wikiaGpt.flushAds();
	}

	wikiaGpt.defineSlots('wikia', slotMapConfig.getConfig(srcName), srcName);

	return {
		name: 'DirectGptMaps',
		fillInSlot: fillInSlot
	};
});
