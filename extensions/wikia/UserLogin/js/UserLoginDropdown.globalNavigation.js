/* global FacebookLogin:true, UserLoginAjaxForm:true */
require([
	'jquery',
	'GlobalNavigationiOSScrollFix',
	'wikia.window',
	'wikia.browserDetect'
], function ($, scrollFix, win, browserDetect) {
	'use strict';
	var $entryPoint, $userLoginDropdown, loginAjaxForm = false;

	/**
	 * Open user login dropdown by adding active class
	 */
	function openMenu() {
		$entryPoint.addClass('active');
		win.transparentOut.show();
		initLoginForm();
		$('#globalNavigation').trigger('user-login-menu-opened');
	}

	/**
	 * Initialize the login form for logged out users
	 */
	function initLoginForm () {
		if (!loginAjaxForm && !window.wgUserName) {
			loginAjaxForm = new UserLoginAjaxForm($entryPoint, {
				skipFocus: true
			});
			FacebookLogin.init(FacebookLogin.origins.DROPDOWN);
		}
	}

	/**
	 * Close user login dropdown by removing active class
	 */
	function closeMenu() {
		$entryPoint.removeClass('active');
		win.transparentOut.hide();
	}

	/**
	 * Close user login dropdown if neither user input nor password input are active
	 */
	function closeMenuIfNotFocused() {
		var id = document.activeElement.id;
		if (!(id === 'usernameInput' || id === 'passwordInput')) {
			closeMenu();
		}
	}

	$(function () {
		var $globalNav = $('#globalNavigation');

		win.transparentOut.bindClick(closeMenu);

		$entryPoint = $('#AccountNavigation');
		$entryPoint.on('click', '.links-container', function (ev) {
			var $this = $(this);
			ev.preventDefault();
			ev.stopImmediatePropagation();

			if ($entryPoint.hasClass('active')) {
				if (!!win.wgUserName) {
					win.location = $this.attr('href') || $this.children('a').attr('href');
				} else {
					closeMenu();
				}
			} else {
				openMenu();
			}

		});

		$userLoginDropdown = $('#UserLoginDropdown');

		if (browserDetect.isIOS7orLower()) {
			$userLoginDropdown
				.on('focus', '#usernameInput, #passwordInput', function () {
					scrollFix.scrollToTop($globalNav);
				})
				.on('blur', '#usernameInput, #passwordInput', function () {
					scrollFix.restoreScrollY($globalNav);
				});
		}

		if (!win.Wikia.isTouchScreen()) {
			win.delayedHover(
				$entryPoint.get(0),
				{
					checkInterval: 100,
					maxActivationDistance: 20,
					onActivate: openMenu,
					onDeactivate: ($userLoginDropdown.length ? closeMenuIfNotFocused : closeMenu),
					activateOnClick: false
				}
			);
		}
	});
});
