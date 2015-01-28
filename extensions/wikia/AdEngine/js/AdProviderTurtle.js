/* jshint maxparams: false, maxlen: 150 */
/*global define*/
define('ext.wikia.adEngine.provider.turtle', [
	'wikia.log',
	'ext.wikia.adEngine.slotTweaker',
	'ext.wikia.adEngine.wikiaGptHelper'
], function (log, slotTweaker, wikiaGpt) {
	'use strict';

	var logGroup = 'ext.wikia.adEngine.provider.turtle',
		srcName = 'turtle',
		slotMap = {
			LEFT_SKYSCRAPER_2:  {size: '300x600,160x600', loc: 'top'},
			TOP_LEADERBOARD:    {size: '728x90,970x250,970x90', loc: 'top'},
			TOP_RIGHT_BOXAD:    {size: '300x250', loc: 'top'}
		};


	function defineSlots() {
		var slotName,
			slotParams;

		for (slotName in slotMap) {
			if (slotMap.hasOwnProperty(slotName)) {
				slotParams = slotMap[slotName];

				slotParams.src = srcName;
				slotParams.pos = slotName;

				wikiaGpt.defineSlot(
					'/98544404/Wikia/Testing',
					slotName + '_' + srcName,
					slotMap[slotName]
				);
			}
		}
	}

	defineSlots();

	function fillInSlot(slotname, success, hop) {
		log(['fillInSlot', slotname], 5, logGroup);

		wikiaGpt.pushAd(
			slotname,
			function (adInfo) { // Success
				slotTweaker.removeDefaultHeight(slotname);
				slotTweaker.removeTopButtonIfNeeded(slotname);
				slotTweaker.adjustLeaderboardSize(slotname);

				success(adInfo);
			},
			function (adInfo) { // Hop
				log(slotname + ' was not filled by DART', 'info', logGroup);

				adInfo.method = 'hop';
				hop(adInfo);
			},
			srcName
		);

		wikiaGpt.flushAds();

	}

	function canHandleSlot(slotname) {
		return !!slotMap[slotname];
	}

	return {
		name: 'Turtle',
		fillInSlot: fillInSlot,
		canHandleSlot: canHandleSlot
	};
});
