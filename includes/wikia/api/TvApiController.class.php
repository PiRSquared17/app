<?php
use Wikia\Search\Config, Wikia\Search\QueryService\Factory, Wikia\Search\QueryService\DependencyContainer;
class TvApiController extends WikiaApiController {

	//const PARAMETER_NAMESPACES = 'namespaces';

	public function getArticle() {
		$this->setResponseFromConfig( $this->getConfigFromRequest() );
	}

	protected function getWikiId(){

		$request = $this->getRequest();
		$params = [
			'controller' => 'SearchApi',
			'method' => 'getCrossWiki',
			'lang' => $request->getVal( 'lang', 'en' ),
			'limit' => $request->getInt( 'limit', 1 ),
			'query' => $request->getVal( 'seriesName', null )
		];

		$request = new WikiaRequest( $params );
		$request->setInternal( true );

		$app = $this->getApp();
		$response = $app->getDispatcher()->dispatch( $app, $request );
		$results = $response->getData();
		if (! count( $results['items']) ) {
			throw new InvalidParameterApiException( 'seriesName' );
		}
		return isset( $results['items'][0] ) ? $results['items'][0]['id'] : null;

	}

	/**
	 * Inspects request and sets config accordingly.
	 * @return Wikia\Search\Config
	 */
	protected function getConfigFromRequest() {
		$request = $this->getRequest();
		$searchConfig = new Wikia\Search\Config;
		$searchConfig->setQuery( $request->getVal( 'episodeName', null ) )
			->setLimit( $request->getInt( 'limit', 1 ) )
			->setPage( $request->getVal( 'batch', 1 ) )
			->setLanguageCode($request->getVal( 'lang', 'en' ))
			->setRank( $request->getVal( 'rank', 'default' ) )
			->setWikiId($this->getWikiId())
			->setVideoSearch( false  )
			->setOnWiki(true)
			->setNamespaces([0,14]);
		;
		//return $this->validateNamespacesForConfig( $searchConfig );
		return $searchConfig;
	}


	/**
	 * Validates user-provided namespaces.
	 * @param Wikia\Search\Config $searchConfig
	 * @throws InvalidParameterApiException
	 * @return Wikia\Search\Config
	 */
	/*protected function validateNamespacesForConfig( $searchConfig ) {
		$namespaces = $this->getRequest()->getArray( 'namespaces', [] );
		if (! empty( $namespaces ) ) {
			foreach ( $namespaces as &$n ) {
				if (! is_numeric( $n ) ) {
					throw new InvalidParameterApiException( self::PARAMETER_NAMESPACES );
				}
			}

			$searchConfig->setNamespaces( $namespaces );
		}
		return $searchConfig;
	}*/

	protected function setResponseFromConfig( Wikia\Search\Config $searchConfig ) {
		if (! $searchConfig->getQuery()->hasTerms() ) {
			throw new InvalidParameterApiException( 'episodeName' );
		}

		//Standard Wikia API response with pagination values
		$responseValues = (new Factory)->getFromConfig( $searchConfig )->searchAsApi( ['pageid' => 'id', 'title', 'url', 'ns' ], true );

		if ( empty( $responseValues['items'] ) ) {
			throw new NotFoundApiException();
		}

		$response = $this->getResponse();
		$response->setValues( $responseValues );

		$response->setCacheValidity(
			86400 /* 24h */,
			86400 /* 24h */,
			array(
				WikiaResponse::CACHE_TARGET_BROWSER,
				WikiaResponse::CACHE_TARGET_VARNISH
			)
		);
	}


}