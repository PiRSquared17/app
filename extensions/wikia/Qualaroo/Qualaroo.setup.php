<?php
/**
 * Qualaroo
 *
 * @author Damian Jóźwiak
 */

$dir = dirname( __FILE__ ) . '/';

$wgExtensionCredits['other'][] = array(
	'name'        => 'Qualaroo',
	'author'      => 'Damian Jóźwiak',
	'description' => 'Qualaroo loader',
	'version'     => 1
);

$wgAutoloadClasses['QualarooHooks'] = $dir . 'QualarooHooks.class.php';

// hooks
$wgHooks['OasisSkinAssetGroups'][] = 'QualarooHooks::onOasisSkinAssetGroups';
$wgHooks['WikiaAssetsPackages'][]  = 'QualarooHooks::onWikiaAssetsPackages';
