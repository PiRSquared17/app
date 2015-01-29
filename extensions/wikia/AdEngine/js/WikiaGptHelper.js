/*global define,setTimeout*/
/*jshint maxlen:125, camelcase:false, maxdepth:7*/
define('ext.wikia.adEngine.wikiaGptHelper', [
	'wikia.log',
	'wikia.window',
	'wikia.document',
	'wikia.lazyqueue',
	'ext.wikia.adEngine.adLogicPageParams',
	'ext.wikia.adEngine.gptSlotConfig',
	'ext.wikia.adEngine.wikiaGptAdDetect'
], function (log, window, document, lazyQueue, adLogicPageParams, gptSlotConfig, gptAdDetect) {
	'use strict';

	var logGroup = 'ext.wikia.adEngine.wikiaGptHelper',
		gptLoaded = false,
		defineSlotsQueue = [],
		slotQueue = [],
		gptSlots = {},
		dataAttribs = {},
		googletag,
		pubads,
		fallbackSize = [1, 1]; // Size to return if there are no sizes matching the screen dimensions

	function convertSizesToGpt(slotsize) {
		log(['convertSizeToGpt', slotsize], 'debug', logGroup);
		var tmp1 = slotsize.split(','),
			sizes = [],
			tmp2,
			i;

		for (i = 0; i < tmp1.length; i += 1) {
			tmp2 = tmp1[i].split('x');
			sizes.push([parseInt(tmp2[0], 10), parseInt(tmp2[1], 10)]);
		}

		return sizes;
	}

	function filterOutSizesBiggerThanScreenSize(sizes) {
		log(['filterOutSizesBiggerThanScreenSize', sizes], 'debug', logGroup);
		var goodSizes = [], i, len, minWidth;

		minWidth = document.documentElement.offsetWidth;

		for (i = 0, len = sizes.length; i < len; i += 1) {
			if (sizes[i][0] <= minWidth) {
				goodSizes.push(sizes[i]);
			}
		}

		if (goodSizes.length === 0) {
			log(['filterOutSizesBiggerThanScreenSize', 'No sizes left. Returning fallbackSize only'], 'error', logGroup);
			goodSizes.push(fallbackSize);
		}

		log(['filterOutSizesBiggerThanScreenSize', 'result', goodSizes], 'debug', logGroup);
		return goodSizes;
	}

	function setPageLevelParams() {
		var name,
			value,
			pageLevelParams = adLogicPageParams.getPageLevelParams(),
			serializedParams = JSON.stringify(pageLevelParams);

		log(['setPageLevelParams', pageLevelParams], 'debug', logGroup);

		for (name in pageLevelParams) {
			if (pageLevelParams.hasOwnProperty(name)) {
				value = pageLevelParams[name];
				if (value) {
					log(['setPageLevelParams', 'pubads.setTargeting', name, value], 'debug', logGroup);
					pubads.setTargeting(name, value);
				}
			}
		}

		for(name in dataAttribs) {
			if (dataAttribs.hasOwnProperty(name)) {
				dataAttribs[name]['data-gpt-page-params'] = serializedParams;
			}
		}
	}

	function defineSlot(slotPath, slotNameGpt, slotParams) {
		var slot,
			name,
			value,
			sizes = convertSizesToGpt(slotParams.size);

		log(['defineSlots', 'googletag.defineSlot', slotPath, slotNameGpt], 'debug', logGroup);

		if (slotParams.pos.match(/TOP_LEADERBOARD/)) {
			sizes = filterOutSizesBiggerThanScreenSize(sizes);
		}

		slot = googletag.defineSlot(slotPath + '/' + slotNameGpt, sizes, slotNameGpt);
		slot.addService(pubads);

		delete slotParams.size;

		for (name in slotParams) {
			if (slotParams.hasOwnProperty(name)) {
				value = slotParams[name];
				if (value) {
					log(['defineSlots', 'slot.setTargeting', name, value], 'debug', logGroup);
					slot.setTargeting(name, value);
				}
			}
		}

		gptSlots[slotNameGpt] = slot;

		dataAttribs[slotNameGpt] = {
			'data-gpt-slot-params': JSON.stringify(slotParams),
			'data-gpt-slot-sizes': JSON.stringify(sizes)
		};

		log(['defineSlots', 'defined slot', slotNameGpt, slot], 'debug', logGroup);
	}

	function defineWikiaSlots() {
		var	pageLevelParams = adLogicPageParams.getPageLevelParams(),
			providerSlotMap = gptSlotConfig.getConfig(),
			slotPath = '/5441/wka.' + pageLevelParams.s0 + '/' + pageLevelParams.s1 + '//' + pageLevelParams.s2,
			slotName,
			slotNameGpt,
			slotMap,
			slotMapSrc,
			slotParams;

		log(['defineSlots', providerSlotMap], 'info', logGroup);

		for (slotMapSrc in providerSlotMap) {
			if (providerSlotMap.hasOwnProperty(slotMapSrc)) {

				slotMap = providerSlotMap[slotMapSrc];

				for (slotName in slotMap) {
					if (slotMap.hasOwnProperty(slotName) && slotMap[slotName].size) {
						log(['defineSlots', 'defining slot', slotName], 'debug', logGroup);

						slotNameGpt = slotName + '_' + slotMapSrc;
						slotParams = slotMap[slotName];

						slotParams.pos = slotParams.pos || slotName;
						slotParams.src = slotMapSrc;

						defineSlot(slotPath, slotNameGpt, slotParams);
					}
				}
			}
		}

		log(['defineSlots', 'all slots defined'], 'debug', logGroup);
	}

	function loadGpt() {
		if (!gptLoaded) {
			log('loadGpt', 7, logGroup);

			var gads = document.createElement('script'),
				node = document.getElementsByTagName('script')[0];

			gptLoaded = true;

			window.googletag = window.googletag || {};
			window.googletag.cmd = window.googletag.cmd || [];

			gads.async = true;
			gads.type = 'text/javascript';
			gads.src = '//www.googletagservices.com/tag/js/gpt.js';

			log('Appending GPT script to head', 7, logGroup);

			node.parentNode.insertBefore(gads, node);
			googletag = window.googletag;

			// Enable services
			log(['loadGpt', 'googletag.cmd.push'], 'info', logGroup);
			googletag.cmd.push(function () {
				pubads = googletag.pubads();

				defineSlotsQueue.start();
				defineWikiaSlots();
				setPageLevelParams();

				pubads.collapseEmptyDivs();
				pubads.enableSingleRequest();
				pubads.disableInitialLoad(); // manually request ads

				googletag.enableServices();

				log(['loadGpt', 'googletag.cmd.push', 'done'], 'debug', logGroup);
			});

			lazyQueue.makeQueue(defineSlotsQueue, function(args){
				defineSlot.apply(this, args);
			});

		}
	}

	function pushAd(slotname, success, error, slotMapSrc) {
		var slotnameGpt = slotname + '_' + slotMapSrc,
			slotDiv = document.createElement('div');

		function callSuccess(adInfo) {
			if (typeof success === 'function') {
				success(adInfo);
			}
		}

		function callError(adInfo) {
			slotDiv.className += ' hidden';
			if (typeof error === 'function') {
				error(adInfo);
			}
		}

		loadGpt();

		log(['pushAd', slotname], 'info', logGroup);

		// Create a div for the GPT ad
		slotDiv.id = slotnameGpt;
		document.getElementById(slotname).appendChild(slotDiv);

		log(['pushAd', slotname, 'Sub-div created'], 'debug', logGroup);

		googletag.cmd.push(function () {
			var attrName;

			log(['googletag.display', slotnameGpt], 'debug', logGroup);
			googletag.display(slotnameGpt);

			slotQueue.push(gptSlots[slotnameGpt]);

			googletag.pubads().addEventListener('slotRenderEnded', function (event) {
				if (event.slot === gptSlots[slotnameGpt]) {
					log(['slotRenderEnded', slotname, event], 'info', logGroup);

					// Add debug info
					slotDiv.setAttribute('data-gpt-line-item-id', JSON.stringify(event.lineItemId));
					slotDiv.setAttribute('data-gpt-creative-id', JSON.stringify(event.creativeId));
					slotDiv.setAttribute('data-gpt-creative-size', JSON.stringify(event.size));

					var iframe = slotDiv.querySelector('div[id*="_container_"] iframe');

					// IE doesn't allow us to inspect GPT iframe at this point.
					// Let's launch our callback in a setTimeout instead.
					setTimeout(function () {
						gptAdDetect.onAdLoad(slotname, event, iframe, callSuccess, callError);
					}, 0);
				}
			});

			// Save page level and slot level params for easier ad delivery debugging
			for (attrName in dataAttribs[slotnameGpt]) {
				if (dataAttribs[slotnameGpt].hasOwnProperty(attrName)) {
					slotDiv.setAttribute(attrName, dataAttribs[slotnameGpt][attrName]);
				}
			}
		});
	}

	function flushAds() {
		if (!gptLoaded) {
			log(['flushAds', 'done', 'no slots to flush'], 'info', logGroup);
			return;
		}

		googletag.cmd.push(function () {
			log(['flushAds', 'start'], 'info', logGroup);

			log(['flushAds', 'refresh', slotQueue], 'debug', logGroup);

			if (slotQueue.length) {
				googletag.pubads().refresh(slotQueue);
				slotQueue = [];
			}

			log(['flushAds', 'done'], 'info', logGroup);
		});
	}

	return {
		defineSlot: function() {
			defineSlotsQueue.push([].slice.apply(arguments));
		},
		pushAd: pushAd,
		flushAds: flushAds
	};

});
