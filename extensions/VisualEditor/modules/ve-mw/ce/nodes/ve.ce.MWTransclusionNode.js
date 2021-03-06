/*!
 * VisualEditor ContentEditable MWTransclusionNode class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/*global mw */

/**
 * ContentEditable MediaWiki transclusion node.
 *
 * @class
 * @abstract
 * @extends ve.ce.LeafNode
 * @mixins ve.ce.FocusableNode
 * @mixins ve.ce.GeneratedContentNode
 *
 * @constructor
 * @param {ve.dm.MWTransclusionNode} model Model to observe
 * @param {Object} [config] Configuration options
 */
ve.ce.MWTransclusionNode = function VeCeMWTransclusionNode( model, config ) {
	// Parent constructor
	ve.ce.LeafNode.call( this, model, config );

	// Mixin constructors
	ve.ce.FocusableNode.call( this );
	ve.ce.GeneratedContentNode.call( this );

	// DOM changes
	this.$element.addClass( 've-ce-mwTransclusionNode' );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWTransclusionNode, ve.ce.LeafNode );

OO.mixinClass( ve.ce.MWTransclusionNode, ve.ce.FocusableNode );
OO.mixinClass( ve.ce.MWTransclusionNode, ve.ce.GeneratedContentNode );

/* Static Properties */

ve.ce.MWTransclusionNode.static.name = 'mwTransclusion';

ve.ce.MWTransclusionNode.static.renderHtmlAttributes = false;

ve.ce.MWTransclusionNode.static.primaryCommandName = 'transclusion';

/* Static Methods */

/**
 * @inheritdoc
 */
ve.ce.MWTransclusionNode.static.getDescription = function () {
	// Wikia change: use "Edit" as context menu description
	return ve.msg( 'wikia-visualeditor-context-transclusion-description' );
};

/* Methods */

/** */
ve.ce.MWTransclusionNode.prototype.generateContents = function ( config ) {
	var xhr, deferred = $.Deferred();
	xhr = ve.init.target.constructor.static.apiRequest( {
		'action': 'visualeditor',
		'paction': 'parsefragment',
		'page': mw.config.get( 'wgRelevantPageName' ),
		'wikitext': ( config && config.wikitext ) || this.model.getWikitext()
	}, { 'type': 'POST' } )
		.done( ve.bind( this.onParseSuccess, this, deferred ) )
		.fail( ve.bind( this.onParseError, this, deferred ) );

	return deferred.promise( { abort: xhr.abort } );
};

/**
 * Handle a successful response from the parser for the wikitext fragment.
 *
 * @param {jQuery.Deferred} deferred The Deferred object created by #generateContents
 * @param {Object} response Response data
 */
ve.ce.MWTransclusionNode.prototype.onParseSuccess = function ( deferred, response ) {
	var contentNodes, $placeHolder;

	if ( !response || response.error || !response.visualeditor || response.visualeditor.result !== 'success' ) {
		return this.onParseError.call( this, deferred );
	}

	contentNodes = $.parseHTML( response.visualeditor.content );
	// HACK: if $content consists of a single paragraph, unwrap it.
	// We have to do this because the PHP parser wraps everything in <p>s, and inline templates
	// will render strangely when wrapped in <p>s.
	if ( contentNodes.length === 1 && contentNodes[0].nodeName.toLowerCase() === 'p' ) {
		contentNodes = Array.prototype.slice.apply( contentNodes[0].childNodes );
	}

	// Check if the final result of the imported template is empty.
	// If it is empty, put an inline placeholder inside it so that it can
	// be accessible to users (either to remove or edit)
	if ( contentNodes.length === 0 ) {
		$placeHolder = this.$( '<span>' )
			.css( { 'display': 'block' } )
			// adapted from ve.ce.BranchNode.$blockSlugTemplate
			// IE support may require using &nbsp;
			.html( '&#xFEFF;' );

		contentNodes.push( $placeHolder[0] );
	}
	deferred.resolve( contentNodes );
};

/**
 * Handle an unsuccessful response from the parser for the wikitext fragment.
 *
 * @param {jQuery.Deferred} deferred The promise object created by #generateContents
 * @param {Object} response Response data
 */
ve.ce.MWTransclusionNode.prototype.onParseError = function ( deferred ) {
	deferred.reject();
};

/* Concrete subclasses */

/**
 * ContentEditable MediaWiki transclusion block node.
 *
 * @class
 * @extends ve.ce.MWTransclusionNode
 * @constructor
 * @param {ve.dm.MWTransclusionBlockNode} model Model to observe
 */
ve.ce.MWTransclusionBlockNode = function VeCeMWTransclusionBlockNode( model ) {
	// Parent constructor
	ve.ce.MWTransclusionNode.call( this, model );

	// DOM changes
	this.$element.addClass( 've-ce-mwTransclusionBlockNode' );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWTransclusionBlockNode, ve.ce.MWTransclusionNode );

/* Static Properties */

ve.ce.MWTransclusionBlockNode.static.name = 'mwTransclusionBlock';

ve.ce.MWTransclusionBlockNode.static.tagName = 'div';

/**
 * ContentEditable MediaWiki transclusion inline node.
 *
 * @class
 * @extends ve.ce.MWTransclusionNode
 * @constructor
 * @param {ve.dm.MWTransclusionInlineNode} model Model to observe
 */
ve.ce.MWTransclusionInlineNode = function VeCeMWTransclusionInlineNode( model ) {
	// Parent constructor
	ve.ce.MWTransclusionNode.call( this, model );

	// DOM changes
	this.$element.addClass( 've-ce-mwTransclusionInlineNode' );
};

/* Inheritance */

OO.inheritClass( ve.ce.MWTransclusionInlineNode, ve.ce.MWTransclusionNode );

/* Static Properties */

ve.ce.MWTransclusionInlineNode.static.name = 'mwTransclusionInline';

ve.ce.MWTransclusionInlineNode.static.tagName = 'span';

/* Registration */

ve.ce.nodeFactory.register( ve.ce.MWTransclusionNode );
ve.ce.nodeFactory.register( ve.ce.MWTransclusionBlockNode );
ve.ce.nodeFactory.register( ve.ce.MWTransclusionInlineNode );
