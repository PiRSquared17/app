This is an experimental extension that should be renamed to something more helpful when possible.
- Sean Colombo 9/11/2010


Dependencies:
	/extensions/wikia/JavascriptAPI/Mediawiki.js (Nick Sullivan's Javascript client to MediaWiki's API).
	/extensions/wikia/RTE (Wikia's RichTextEditor - for reverse-parsing HTML into wikitext)


TODO:
	- Step 1: Store data
X		- Get a prototype page where I can put in some arbitrary text (plaintext or wikitext)
X		- Login via the JS API
X		- Submit the plaintext/wikitext to be stored in a MediaWiki API successfully (as the logged-in user).
~		- Change previous prototype to take HTML as input, then use the reverse-parser to turn it into wikitext before submitting to the MediaWiki API.
~			RTE.ajax('html2wiki', params, callback)
~			This is done but it doesn't work that well at parsing arbitrary HTML. It makes sense, since it was just designed to go between RTE's HTML and Wikitext.
		TODO FIXME:
			- Images don't make it through
			- Mangled css shows up in the content sometimes

	- Step 2: Retrieve data
		- Go to a page and have it check for a match for the article.
		- Pull up the parsed article from MediaWiki using the Javascript API.

	- Extension-side:
		- Work on making the extension better at finding the "article contents".  It is hardcoded for TechCrunch at the moment.
