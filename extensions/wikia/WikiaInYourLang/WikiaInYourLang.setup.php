<?php
/**
 * Displays a notification if a wikia is available
 * in a user's native language.
 * The check is based on Geo cookie and a browser's language.
 *
 * @package Wikia\extensions\WikiaInYourLang
 * @version 0.1
 * @author Adam Karminski <adamk@wikia-inc.com>
 * @see https://github.com/Wikia/app/tree/dev/extensions/wikia/WikiaInYourLang/
 */

/**
 * @global Array $wgExtensionCredits The list of extension credits.
 * @see http://www.mediawiki.org/wiki/Manual:$wgExtensionCredits
 */
$wgExtensionCredits['other'][] = array(
	'path'              => __FILE__,
	'name'              => 'WikiaInYourLang',
	'descriptionmsg'    => 'wikia-in-your-lang-description',
	'version'           => '1.0',
	'author'            => [
		'Adam Karminski <adamk@wikia-inc.com>'
	],
	'url'               => 'https://github.com/Wikia/app/tree/dev/extensions/wikia/WikiaInYourLang/',
);

$wgExtensionMessagesFiles['WikiaInYourLang'] = __DIR__ . '/WikiaInYourLang.i18n.php';

$wgAutoloadClasses['Wikia\WikiaInYourLang\WikiaInYourLangHooks'] = __DIR__ . '/WikiaInYourLang.hooks.php';
$wgAutoloadClasses['WikiaInYourLangController'] = __DIR__ . '/WikiaInYourLangController.class.php';

/**
 * Use ResourceLoader to load the JavaScript module
 */
$wgResourceModules['ext.wikiaInYourLang'] = [
	'localBasePath' => __DIR__ . '/modules',
	'remoteExtPath' => 'wikia/WikiaInYourLang/modules',
	'scripts' => 'ext.wikiaInYourLang.js',
	'dependencies' => [
		'wikia.cache',
		'wikia.geo',
		'wikia.tracker',
	],
];

/**
 * Add the JavaScript module to the output
 */
$wgHooks['BeforePageDisplay'][] = "Wikia\WikiaInYourLang\WikiaInYourLangHooks::onBeforePageDisplay";
