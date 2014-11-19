define(
	'wikia.recommendations',
	['wikia.loader', 'wikia.window', 'jquery', 'wikia.nirvana', 'wikia.arrayHelper'],
	function(loader, win, $, nirvana, arrayHelper) {
		'use strict';

		/**
		 * @desc Load recommendations template
		 * @param {Function} callback function passed to process recieved template
		 */
		function load(callback) {
			$.when(
				nirvana.sendRequest({
					controller: 'RecommendationsApi',
					method: 'getArticle',
					data: {
						id: win.wgArticleId
					}
				}),
				loader({
					type: loader.MULTI,
					resources: {
						mustache: '/extensions/wikia/Recommendations/templates/Recommendations_index.mustache,/extensions/wikia/Recommendations/templates/Recommendations_image.mustache,/extensions/wikia/Recommendations/templates/Recommendations_video.mustache',
						scripts: 'recommendations_view_js',
						styles: 'extensions/wikia/Recommendations/styles/recommendations.scss',
						messages: 'Recommendations'
					}
				})
			).done(function (slotsData, res) {
				loader.processStyle(res.styles);
				loader.processScript(res.scripts);

				if (typeof(callback) === 'function') {
					require(['wikia.recommendations.view'], function (view) {
						var template;

						slotsData = arrayHelper.shuffle(slotsData[0].items);

						template = view.render(slotsData, res.mustache);
						callback(template);
					});
				}
			});
		}

		return {
			load: load
	};
});
