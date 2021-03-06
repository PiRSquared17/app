<?php
namespace Wikia\ExactTarget;

class ExactTargetUpdateUserTask extends ExactTargetTask {

	/**
	 * Task for updating user data in ExactTarget
	 * @param array $aUserData Selected fields from Wikia user table
	 */
	public function updateUserData( $aUserData ) {
		$oHelper = $this->getUserHelper();
		$aApiParams = $oHelper->prepareUserUpdateParams( $aUserData );
		$oApiDataExtension = $this->getApiDataExtension();
		$oApiDataExtension->updateRequest( $aApiParams );
	}

	/**
	 * Sends update of user email to ExactTarget
	 * @param int $iUserId
	 * @param string $iUserEmail
	 */
	public function updateUserEmail( $iUserId, $sUserEmail ) {
		/* Delete subscriber (email address) used by touched user */
		$oDeleteUserTask = $this->getDeleteUserTask();
		$oDeleteUserTask->deleteSubscriber( $iUserId );
		/* Subscriber list contains unique emails
		 * Assuming email may be new - try to create subscriber object using the email */
		$oCreateUserTask = $this->getCreateUserTask();
		$oCreateUserTask->createSubscriber( $sUserEmail );

		/* Update email in user data extension */
		$aUserData = [
			'user_id' => $iUserId,
			'user_email' => $sUserEmail
		];
		$oHelper = $this->getUserHelper();
		$aApiParams = $oHelper->prepareUserUpdateParams( $aUserData );
		$oApiDataExtension = $this->getApiDataExtension();
		$oApiDataExtension->updateRequest( $aApiParams );
	}

	/**
	 * Task for creating a record with user group and user in ExactTarget
	 * @param int $iUserId
	 * @param string $sGroup name of added group
	 */
	public function addUserGroup( $iUserId, $sGroup ) {
		$oHelper = $this->getUserHelper();
		$aApiParams = $oHelper->prepareUserGroupCreateParams( $iUserId, [ $sGroup ] );
		$oApiDataExtension = $this->getApiDataExtension();
		$oApiDataExtension->createRequest( $aApiParams );
	}

	/**
	 * Task for removing a record with user group and user in ExactTarget
	 * @param int $iUserId
	 * @param string $sGroup name of removed group
	 */
	public function removeUserGroup( $iUserId, $sGroup ) {
		$oHelper = $this->getUserHelper();
		$aApiParams = $oHelper->prepareUserGroupRemoveParams( $iUserId, [ $sGroup ] );
		$oApiDataExtension = $this->getApiDataExtension();
		$oApiDataExtension->deleteRequest( $aApiParams );
	}

	/**
	 * Task for updating user_properties data in ExactTarget
	 * @param array $aUserData Selected fields from Wikia user table
	 * @param array $aUserProperties Array of Wikia user gloal properties ['property_name'=>'property_value']
	 */
	public function updateUserPropertiesData( $aUserData, $aUserProperties ) {
		$oHelper = $this->getUserHelper();
		$aApiParams = $oHelper->prepareUserPropertiesUpdateParams( $aUserData['user_id'], $aUserProperties );
		$oApiDataExtension = $this->getApiDataExtension();
		$oApiDataExtension->updateRequest( $aApiParams );
	}

	/**
	 * Task for incremental updating number of user contributions on specific wiki
	 * @param array $aUsersEditsData should has following form:
	 * Array (
	 * 		{int user id} => [
	 * 			[
	 * 				'wiki_id' => {wiki id},
	 * 				'contributions' => {number of edits}
	 * 			],
	 * 			[
	 * 				...
	 * 			]
	 * 		],
	 * 		{int user id} => [
	 * 				...
	 * 		]
	 * )
	 */
	public function updateUsersEdits( array $aUsersEditsData ) {
		$aUsersIds = array_keys( $aUsersEditsData );

		// Get number of edits from ExactTarget
		$oRetrieveUserHelper = $this->getRetrieveUserHelper();
		$aUserEditsDataFromET = $oRetrieveUserHelper->retrieveUserEdits( $aUsersIds );

		// Merge number of edits from ExactTarget with incremental data that came as a function parameter
		$oHelper = $this->getUserHelper();
		$oHelper->mergeUsersEditsData( $aUsersEditsData, $aUserEditsDataFromET );

		// Send update request to update number of edits
		$oApiDataExtension = $this->getApiDataExtension();
		$aApiParams = $oHelper->prepareUserEditsUpdateParams( $aUsersEditsData );
		$oApiDataExtension->updateFallbackCreateRequest( $aApiParams );
	}

}
