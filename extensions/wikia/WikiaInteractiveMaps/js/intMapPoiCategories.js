define('wikia.intMap.poiCategories',
	[
		'jquery',
		'wikia.querystring',
		'wikia.window',
		'wikia.intMap.utils'
	],
	function($, qs, w, utils) {
		'use strict';

		// reference to modal component
		var modal,

		// modal configuration
			modalConfig = {
				vars: {
					id: 'intMapPoiCategories',
					classes: ['int-map-modal'],
					size: 'medium',
					content: '',
					title: '',
					buttons: [
						{
							vars: {
								value: $.msg('wikia-interactive-maps-poi-categories-save'),
								classes: ['normal', 'primary'],
								data: {
									key: 'event',
									value: 'save'
								}
							}
						}, {
							vars: {
								value: $.msg('wikia-interactive-maps-poi-categories-cancel'),
								data: {
									key: 'event',
									value: 'close'
								}
							}
						}
					]
				}
			},

		// mustache templates
			poiCategoriesTemplate,
			poiCategoryTemplate,
			parentPoiCategoryTemplate,

		// template data
			poiCategoriesTemplateData = {
				poiCategories: [],
				addPoiCategory: $.msg('wikia-interactive-maps-poi-categories-add'),
				mapId: null
			},
			poiCategoryTemplateData = {
				delete: $.msg('wikia-interactive-maps-poi-categories-delete'),
				placeholder: $.msg('wikia-interactive-maps-poi-categories-name-placeholder'),
				emptyOption: $.msg('wikia-interactive-maps-poi-categories-select-category'),
				uploadImgLink: $.msg('wikia-interactive-maps-poi-categories-upload-image-link'),
				iconSize: 34,
				parentPoiCategories: []
			},

			createPoiCategoriesTitle = $.msg('wikia-interactive-maps-poi-categories-header-create'),
			editPoiCategoriesTitle = $.msg('wikia-interactive-maps-poi-categories-header-edit'),

			events = {
				addPoiCategory: [
					addPoiCategory
				],
				deletePoiCategory: [
					deletePoiCategory
				],
				uploadMarkerImage: [
					uploadMarkerImage
				],
				saveMarkerImage: [
					saveMarkerImage
				],
				previewMarkerImage: [
					previewMarkerImage
				],
				save: [
					savePoiCategories
				],
				poiCategoriesSaved: [
					poiCategoriesSaved
				],
				triggerMarkerUpload: [
					triggerMarkerUpload
				]
			},
			pontoTrigger,
			params,
			mapId,
			mapUrl,
			mode,
			modalModes = {
				CREATE: 'create',
				EDIT: 'edit'
			},
			poiCategoriesOriginalData;

		/**
		 * @desc Entry point for modal
		 * @param {array} templates - mustache templates
		 * @param {object} _params - params from iframe (ponto) or map creation modal
		 * @param {function} _trigger - callback function to send result back to iframe (ponto)
		 */
		function init(templates, _params, _trigger) {
			// set reference to params and trigger callback
			pontoTrigger = _trigger;
			params = _params;
			mapId = params.mapId;

			poiCategoriesTemplate = templates[0];
			poiCategoryTemplate = templates[1];
			parentPoiCategoryTemplate = templates[2];

			mode = params.mode || modalModes.CREATE;
			setModalMode();

			setUpParentPoiCategories()
				.then(function () {
					setUpModal(params);
				});
		}

		/**
		 * @desc Sets up modal config and creates it
		 * @param {object} data - params passed to modal
		 */
		function setUpModal(data) {
			setUpTemplateData(data);
			mapUrl = data.mapUrl;
			poiCategoriesOriginalData = data.poiCategories;

			modalConfig.vars.content = utils.render(poiCategoriesTemplate, poiCategoriesTemplateData, {
				poiCategory: poiCategoryTemplate,
				parentPoiCategory: parentPoiCategoryTemplate
			});

			utils.createModal(modalConfig, function (_modal) {
				// set reference to modal component
				modal = _modal;

				// cache selectors
				modal.$errorContainer = modal.$content.children('.error');
				modal.$form = $('#intMapPoiCategoriesForm');

				utils.bindEvents(modal, events);

				// TODO: figure out where is better place to place it and move it there
				modal.$element.on('change', '.poi-category-marker-image-upload', function (event) {
					modal.trigger('uploadMarkerImage', event.target);
				});

				modal.show();
			});
		}

		/**
		 * @desc sets modal mode (create POI categories / edit existing POI categories)
		 */
		function setModalMode() {
			var title = createPoiCategoriesTitle;

			if (mode === modalModes.EDIT) {
				title = editPoiCategoriesTitle;
			}

			modalConfig.vars.title = title;
		}

		/**
		 * @desc extends POI category
		 * @param {object} poiCategory - data for POI category
		 * @returns {object} - POI category data with default template variables
		 */
		function extendPoiCategoryData(poiCategory) {
			// clone this object so we don't overwrite default template data
			var extendedPoiCategoryTemplateData = $.extend(true, {}, poiCategoryTemplateData);

			extendedPoiCategoryTemplateData.id = poiCategory.id;
			extendedPoiCategoryTemplateData.name = poiCategory.name;

			if (!poiCategory.no_marker) {
				extendedPoiCategoryTemplateData.marker = poiCategory.marker;
			}

			extendedPoiCategoryTemplateData.parentPoiCategories.forEach(function (parentPoiCategory, i) {
				if (parentPoiCategory.id === poiCategory.parent_poi_category_id) {
					extendedPoiCategoryTemplateData.parentPoiCategories[i].selected = ' selected';
				} else {
					extendedPoiCategoryTemplateData.parentPoiCategories[i].selected = null;
				}
			});

			return extendedPoiCategoryTemplateData;
		}

		/**
		 * @desc extends array of POI categories
		 * @param {array} poiCategories - array of POI category objects
		 * @returns {array} - array of extended POI categories objects
		 */
		function extendPoiCategoriesData(poiCategories) {
			var extendedPoiCategories = [];

			poiCategories.forEach(function (poiCategory) {
				extendedPoiCategories.push(extendPoiCategoryData(poiCategory));
			});

			return extendedPoiCategories;
		}

		/**
		 * @desc gets parent POI categories list from backend and puts it in template data
		 * @returns {object} - promise
		 */
		function setUpParentPoiCategories() {
			var dfd = new $.Deferred(),
				parentPoiCategories;

			getParentPoiCategories()
				.then(function (response) {
					var data = response.results;

					if (data && data.success) {
						parentPoiCategories = data.content;
					} else {
						utils.showError(modal, data.content.message);
						parentPoiCategories = data.content;
					}

					poiCategoryTemplateData.parentPoiCategories = parentPoiCategories;
					dfd.resolve();
				});

			return dfd.promise();
		}

		/**
		 * @desc sets up template data
		 * @param {object} existingData - existing data from DB
		 */
		function setUpTemplateData(existingData) {
			// if no POI categories display blank POI category input
			var poiCategories = existingData.poiCategories ? existingData.poiCategories : [{}];

			poiCategoriesTemplateData.mapId = existingData.id || mapId;
			poiCategoriesTemplateData.poiCategories = extendPoiCategoriesData(poiCategories);
		}

		/**
		 * @desc adds blank POI category input field
		 */
		function addPoiCategory() {
			modal.$form.append(utils.render(poiCategoryTemplate, extendPoiCategoryData({}), {
				parentPoiCategory: parentPoiCategoryTemplate
			}));
		}

		/**
		 * @desc deletes POI category
		 * @param {Event} event
		 */
		function deletePoiCategory(event) {
			var poiCategoryContainer = $(event.target).closest('.poi-category'),
				poiCategoryId = poiCategoryContainer.data('id');

			if (poiCategoryId) {
				markPoiCategoryAsDeleted(poiCategoryId);
			}

			poiCategoryContainer.remove();
		}

		/**
		 * @desc adds POI category id to hidden field
		 * @param poiCategoryId
		 */
		function markPoiCategoryAsDeleted(poiCategoryId) {
			// add POI category id to hidden field
			var poiCategoriesToDeleteElement = $('#poiCategoriesToDelete'),
				poiCategoriesToDelete = JSON.parse('[' + poiCategoriesToDeleteElement.val() + ']');

			poiCategoriesToDelete.push(poiCategoryId);
			poiCategoriesToDeleteElement.val(poiCategoriesToDelete.join(','));
		}

		/**
		 * @desc uploads marker image to backend
		 * @param {Element} inputElement - file input element
		 */
		function uploadMarkerImage(inputElement) {
			var file = inputElement.files[0],
				formData = new FormData(),
				$inputElement = $(inputElement),
				$inputElementWrapper = $inputElement.closest('.poi-category-marker');

			formData.append('wpUploadFile', file);

			utils.upload(modal, formData, 'marker', function (data) {
				modal.trigger('saveMarkerImage', data, $inputElementWrapper);
				modal.trigger('previewMarkerImage', data, $inputElement, $inputElementWrapper);
			});
		}

		/**
		 * @desc hides file input and shows marker image instead
		 * @param {object} data - data returned from backend
		 * @param {$} $inputElementWrapper - file input element wrapper
		 */
		function saveMarkerImage(data, $inputElementWrapper) {
			$inputElementWrapper
				.find('.poi-category-marker-image-url')
				.val(data['fileThumbUrl']);
		}

		/**
		 * @desc hides file input and shows marker image instead
		 * @param {object} data - data returned from backend
		 * @param {$} $inputElement - file input element
		 * @param {$} $inputElementWrapper - file input element wrapper
		 */
		function previewMarkerImage(data, $inputElement, $inputElementWrapper) {
			$inputElement.val('');
			$inputElementWrapper
				.find('.poi-category-marker-image')
				.attr('src', data['fileThumbUrl'])
				.removeClass('hidden')
				.siblings('span')
				.addClass('hidden');
		}

		/**
		 * @desc gets parent POI categories list from backend
		 * @returns {object} - promise
		 */
		function getParentPoiCategories() {
			return $.nirvana.sendRequest({
				controller: 'WikiaInteractiveMapsPoiCategory',
				method: 'getParentPoiCategories',
				format: 'json',
				onErrorCallback: function (response) {
					utils.handleNirvanaException(modal, response);
				}
			});
		}

		/**
		 * @desc returns true if POI category is invalid
		 * @param {object} poiCategory
		 * @returns {boolean} - is valid
		 */
		function isPoiCategoryInvalid(poiCategory) {
			return utils.isEmpty(poiCategory.name);
		}

		/**
		 * @desc validates POI categories
		 * @param {object} formSerialized - object with serialized form
		 * @returns {boolean} - is valid
		 */
		function validateFormData(formSerialized) {
			if (!formSerialized.poiCategories) {
				utils.showError(modal, $.msg('wikia-interactive-maps-poi-categories-form-no-category-error'));
				return false;
			}

			if (formSerialized.poiCategories.some(isPoiCategoryInvalid)) {
				utils.showError(modal, $.msg('wikia-interactive-maps-poi-categories-form-error'));
				return false;
			}

			return true;
		}

		/**
		 * @desc checks if POI category data was changed by user
		 * @param {object} poiCategoryOriginal
		 * @param {object} poiCategory
		 * @returns {boolean} - is POI category changed
		 */
		function isPoiCategoryChanged(poiCategoryOriginal, poiCategory) {
			if (poiCategory.name !== poiCategoryOriginal.name) {
				return true;
			}

			if (poiCategory.parent_poi_category_id !== poiCategoryOriginal.parent_poi_category_id) {
				return true;
			}

			// if marker property is not empty it means there was a new image uploaded
			if (poiCategory.marker) {
				return true;
			}

			return false;
		}

		/**
		 * @desc organizes form data to object that will be sent to backend
		 * @param {object} formSerialized
		 * @returns {object} - organized POI categories data
		 */
		function organizePoiCategories(formSerialized) {
			var poiCategories = {
				mapId: parseInt(formSerialized.mapId, 10),
				poiCategoriesToCreate: [],
				poiCategoriesToUpdate: [],
				poiCategoriesToDelete: []
			};

			if (formSerialized.poiCategories) {
				formSerialized.poiCategories.forEach(function (poiCategory) {
					var poiCategoryOriginal;

					if (poiCategory.parent_poi_category_id) {
						poiCategory.parent_poi_category_id = parseInt(poiCategory.parent_poi_category_id, 10);
					}

					if (poiCategory.id) {
						poiCategory.id = parseInt(poiCategory.id, 10);

						poiCategoryOriginal = findPoiCategoryById(poiCategory.id, poiCategoriesOriginalData);

						if (poiCategoryOriginal && isPoiCategoryChanged(poiCategoryOriginal, poiCategory)) {
							poiCategories.poiCategoriesToUpdate.push(poiCategory);
						}
					} else {
						delete poiCategory.id;
						poiCategories.poiCategoriesToCreate.push(poiCategory);
					}
				});
			}

			if (formSerialized.poiCategoriesToDelete) {
				poiCategories.poiCategoriesToDelete = formSerialized.poiCategoriesToDelete.split(',').map(Number);
			}

			return poiCategories;
		}

		/**
		 * @desc sends POI categories data to PHP controller
		 * @param {object} data - object with serialized and validated form
		 */
		function sendPoiCategories(data) {
			if (!data) {
				return;
			}

			modal.deactivate();
			$.nirvana.sendRequest({
				controller: 'WikiaInteractiveMapsPoiCategory',
				method: 'editPoiCategories',
				format: 'json',
				data: data,
				callback: function(response) {
					var results = response.results;

					if (results && results.success) {
						utils.cleanUpError(modal);
						modal.trigger('poiCategoriesSaved', data, results.content);
						utils.track(utils.trackerActions.IMPRESSION, 'poi-category-' + mode, data.mapId);
					} else {
						utils.showError(modal, results.content.message);
						modal.activate();
					}
				},
				onErrorCallback: function(response) {
					utils.handleNirvanaException(modal, response);
					modal.activate();
				}
			});
		}

		/**
		 * @desc handler method triggered by savePoiCategories event
		 */
		function savePoiCategories() {
			var formSerialized = modal.$form.serializeObject();

			if (validateFormData(formSerialized)) {
				sendPoiCategories(organizePoiCategories(formSerialized));
			}
		}

		/**
		 * @desc finds POI category in array by looking at ids
		 * @param id - POI category id
		 * @param poiCategories - array of POI categories
		 * @returns {object|null} - POI category with given id or null if not found
		 */
		function findPoiCategoryById(id, poiCategories) {
			return $.grep(poiCategories, function (item) {
				return item.id === id;
			})[0] || null;
		}

		/**
		 * @desc cleans up POI category data after updating it, copies what's needed from the original data
		 * @param poiCategoryUpdated
		 * @param poiCategoryOriginal
		 * @returns {object} - POI category with current data
		 */
		function setPoiCategoryUpdatedData(poiCategoryUpdated, poiCategoryOriginal) {
			poiCategoryUpdated.map_id = poiCategoryOriginal.map_id;
			poiCategoryUpdated.status = poiCategoryOriginal.status;
			poiCategoryUpdated.marker = (!poiCategoryOriginal.no_marker && !poiCategoryUpdated.marker) ?
				poiCategoryOriginal.marker :
				poiCategoryUpdated.marker;

			if (poiCategoryOriginal.no_marker && !poiCategoryUpdated.marker) {
				poiCategoryUpdated.no_marker = true;
			}

			return poiCategoryUpdated;
		}

		/**
		 * @desc cleans up POI categories data after edit
		 * @param {object} dataSent - POI categories sent to backend
		 * @param {object} dataReceived - response from backend, array of actions done and categories affected
		 * @returns {array} - current POI categories list
		 */
		function updatePoiCategoriesData(dataSent, dataReceived) {
			var currentPoiCategories = [];

			poiCategoriesOriginalData.forEach(function (poiCategoryOriginal) {
				var poiCategoryUpdated = null;

				if (
					dataReceived.poiCategoriesUpdated &&
					dataReceived.poiCategoriesUpdated.indexOf(poiCategoryOriginal.id) > -1
				) {
					poiCategoryUpdated = findPoiCategoryById(poiCategoryOriginal.id, dataSent.poiCategoriesToUpdate);
					if (poiCategoryUpdated) {
						currentPoiCategories.push(setPoiCategoryUpdatedData(poiCategoryUpdated, poiCategoryOriginal));
					}
				} else if (
					!(dataReceived.poiCategoriesDeleted &&
					dataReceived.poiCategoriesDeleted.indexOf(poiCategoryOriginal.id) > -1)
				) {
					currentPoiCategories.push(poiCategoryOriginal);
				}

				// else the POI category was deleted and we skip it
			});

			if (dataReceived.poiCategoriesCreated) {
				dataReceived.poiCategoriesCreated.forEach(function (poiCategory) {
					currentPoiCategories.push(poiCategory);
				});
			}

			return currentPoiCategories;
		}

		/**
		 * @desc Handler for poiCategoriesSaved event. Sends data to Ponto and closes the modal or redirects to map page.
		 * @param {object} dataSent - POI categories sent to backend
		 * @param {object} dataReceived - response from backend, array of actions done and categories affected
		 */
		function poiCategoriesSaved(dataSent, dataReceived) {
			if (mode === modalModes.EDIT) {
				if (typeof pontoTrigger === 'function') {
					pontoTrigger(updatePoiCategoriesData(dataSent, dataReceived));
				}
				modal.trigger('close');
			} else {
				qs(mapUrl).goTo();
			}
		}

		/**
		 * @desc handler for triggering upload form for marker image
		 * @param {Event} event
		 */
		function triggerMarkerUpload(event) {
			$(event.currentTarget).siblings('.poi-category-marker-image-upload').click();
		}

		return {
			init: init,
			isPoiCategoryChanged: isPoiCategoryChanged // for unit testing
		};
	}
);
