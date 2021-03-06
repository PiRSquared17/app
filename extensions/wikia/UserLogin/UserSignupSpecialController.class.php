<?php

/**
 * UserSignup Special Page
 * @author Hyun
 * @author Saipetch
 *
 */
class UserSignupSpecialController extends WikiaSpecialPageController {

	/** @var UserLoginHelper */
	private $userLoginHelper = null;

	public function __construct() {
		parent::__construct( 'UserSignup', '', false );

		$this->disableCaptcha();
	}

	public function init() {
		$skin = $this->wg->User->getSkin();
		$this->isMonobookOrUncyclo = ( $skin instanceof SkinMonoBook || $skin instanceof SkinUncyclopedia );
		$this->isEn = ( $this->wg->Lang->getCode() == 'en' );
		$this->userLoginHelper = ( new UserLoginHelper );
	}

	/**
	 * Route the view based on logged in status
	 *
	 * The only logged in user who must not be re-routed away from
	 * the signup form are those who have the right to create new
	 * accounts (are members of the createaccount group and therefore
	 * have the createaccount right). An example use case: Wikia One's
	 * user accounts can be created by a limited group of Wikia
	 * employees who have been given the right explicitly.
	 */
	public function index() {
		JSMessages::enqueuePackage( 'UserSignup', JSMessages::EXTERNAL );

		if ( $this->wg->User->isLoggedIn() && !$this->wg->User->isAllowed( 'createaccount' ) ) {
			$this->forward( 'UserLoginSpecialController', 'loggedIn' );
		} else {
			$this->forward( __CLASS__, 'signupForm' );
		}
	}

	/**
	 * @brief serves standalone signup page on GET.  if POSTed, parameters will be required.
	 * @details
	 *   on GET, template will render
	 *   on POST,
	 *     if signup is successful, it will redirect to returnto, or mainpage of wiki
	 *     if signup is not successful, the template will render error messages, highlighting the errors
	 * @requestParam string userloginext01 - on POST
	 * @requestParam string email - on POST
	 * @requestParam string password - on POST
	 * @requestParam string birthmonth - on POST
	 * @requestParam string birthday - on POST
	 * @requestParam string birthyear - on POST
	 * @requestParam string captcha - on POST
	 * @requestParam string returnto - url to return to upon successful login
	 * @requestParam string signupToken
	 * @requestParam string uselang
	 * @responseParam string result [ok/error]
	 * @responseParam string msg - result message
	 * @responseParam string errParam - error param
	 */
	public function signupForm () {
		$this->wg->Out->setPageTitle( wfMessage( 'usersignup-page-title' )->plain() );
		$this->response->addAsset( 'extensions/wikia/UserLogin/css/UserSignup.scss' );

		if ( $this->app->checkSkin( 'oasis' ) ) {
			$this->response->addAsset( 'user_signup_js' );
		}

		// We're not supporting connecting with facebook from this page while logged in
		if (
			!empty( $this->wg->EnableFacebookClientExt ) &&
			!$this->wg->User->isLoggedIn() &&
			!$this->isMonobookOrUncyclo
		) {
			$this->response->addAsset( 'extensions/wikia/UserLogin/js/UserLoginFacebookPageInit.js' );
		}

		// hide things in the skin
		$this->wg->SuppressWikiHeader = true;
		$this->wg->SuppressPageHeader = true;
		$this->wg->SuppressFooter = true;
		$this->wg->SuppressAds = true;
		$this->wg->SuppressToolbar = true;

		$this->getOutput()->disallowUserJs(); // just in case...

		// form params
		$this->username = $this->request->getVal( 'userloginext01', '' );
		$this->email = $this->request->getVal( 'email', '' );
		$this->password = $this->request->getVal( 'userloginext02', '' );
		$this->birthmonth = $this->request->getVal( 'birthmonth', '' );
		$this->birthday = $this->request->getVal( 'birthday', '' );
		$this->birthyear = $this->request->getVal( 'birthyear', '' );
		$this->returnto = $this->request->getVal( 'returnto', '' );
		$this->byemail = $this->request->getBool( 'byemail', false );
		$this->signupToken = UserLoginHelper::getSignupToken();
		$this->uselang = $this->request->getVal( 'uselang', 'en' );

		//fb#38260 -- removed uselang
		$this->avatars = $this->userLoginHelper->getRandomAvatars();

		// template params
		$this->pageHeading = wfMessage( 'usersignup-heading' )->escaped();
		$this->createAccountButtonLabel = wfMessage( 'createaccount' )->escaped();
		if( $this->byemail ) {
			$this->pageHeading = wfMessage( 'usersignup-heading-byemail' )->escaped();
			$this->createAccountButtonLabel = wfMessage( 'usersignup-createaccount-byemail' )->escaped();
		}

		if ( $this->app->checkSkin( 'wikiamobile' ) ) {
			$this->wg->Out->setPageTitle( wfMessage( 'usersignup-page-title-wikiamobile' )->escaped() );
			$this->overrideTemplate( 'WikiaMobileIndex' );
		}

		// process signup
		$redirected = $this->request->getVal( 'redirected', '' );
		if ( $this->wg->Request->wasPosted() && empty( $redirected ) ) {

			$response = $this->app->sendRequest( 'UserSignupSpecial', 'signup' );

			$this->result = $response->getVal( 'result', '' );
			$this->msg = $response->getVal( 'msg', '' );
			$this->errParam = $response->getVal( 'errParam', '' );

			if ( $this->result == 'ok' ) {

				/*
				 * Remove when SOC-217 ABTest is finished
				 */
				$signupForm = new UserLoginForm( $this->wg->request );

				if ( $signupForm->isAllowedRegisterUnconfirmed() ) {
					$user = User::newFromName( $this->username );
					// Get and clear redirect page
					$userSignupRedirect = $user->getOption( UserLoginSpecialController::SIGNUP_REDIRECT_OPTION_NAME );
					$user->setOption( UserLoginSpecialController::SIGNUP_REDIRECT_OPTION_NAME, null );

					$user->saveSettings();

					// redirect user
					if ( !empty( $userSignupRedirect ) ) {
						// Redirect user to the point where he finished (when signup on create wiki)
						$title = SpecialPage::getTitleFor( 'CreateNewWiki' );
						$query = $userSignupRedirect;
					} else {
						$title = $user->getUserPage();
						$query = '';
					}

					$redirectUrl = $title->getFullURL( $query );
				} else {
				/*
				 * end remove
				 */
					$params = [
						'method' => 'sendConfirmationEmail',
						'username' => $this->username,
						'byemail' => intval( $this->byemail ),
					];
					$redirectUrl = $this->wg->title->getFullUrl( $params );
				}

				$this->wg->out->redirect( $redirectUrl );
			}

		}
	}

	public function captcha() {
		$this->rawHtml = '';
		$captchaObj = $this->getCaptchaObj();
		if ( !empty( $captchaObj ) ) {
			$this->rawHtml = $captchaObj->getForm();
			$this->isFancyCaptcha = ( class_exists( 'Captcha\Module\FancyCaptcha' ) && $captchaObj instanceof Captcha\Module\FancyCaptcha );
		}
	}

	private function getCaptchaObj() {
		$captchaObj = null;

		if ( !empty( $this->wg->WikiaEnableConfirmEditExt ) ) {
			$captchaObj = ConfirmEditHooks::getInstance();
		} elseif ( !empty( $this->wg->EnableCaptchaExt ) ) {
			$captchaObj = Captcha\Factory\Module::getInstance();
		}
		return $captchaObj;
	}

	/**
	 * @brief ajax call for signup.  returns status code
	 * @details
	 *   for use with ajax call or standalone data call only
	 * @requestParam string userloginext01 //CE-413 signup spam attack - changing username field to userloginext01
	 * @requestParam string email
	 * @requestParam string userloginext02 //CE-413 signup spam attack - changing password field to userloginext02
	 * @requestParam string birthmonth
	 * @requestParam string birthday
	 * @requestParam string birthyear
	 * @requestParam string captcha
	 * @responseParam string result [ok/error]
	 * @responseParam string msg - result message
	 * @responseParam string errParam - error param
	 */
	public function signup() {
		// Init session if necessary
		if ( session_id() == '' ) {
			wfSetupSession();
		}

		if ( $this->wg->request->getVal( 'type', '' ) == '' ) {
			$this->wg->request->setVal( 'type', 'signup' );
		}
		$signupForm = new UserLoginForm( $this->wg->request );
		$signupForm->load();

		if ( !$signupForm->EmptySpamFields() ) {
			$this->result = 'error';
			return;
		}

		$byemail = $this->wg->request->getBool( 'byemail', false );
		if ( $byemail ) {
			$ret = $signupForm->addNewAccountMailPassword();
		} else {
			$ret = $signupForm->addNewAccount();
		}

		$this->result = ( $signupForm->msgType == 'error' ) ? $signupForm->msgType : 'ok' ;
		$this->msg = $signupForm->msg;
		$this->errParam = $signupForm->errParam;

		// pass and ID of created account for FBConnect feature
		if ( $ret instanceof User ) {
			$this->userId = $ret->getId();
			$this->userPage = $ret->getUserPage()->getFullUrl();
		}
	}

	/**
	 * @brief renders content in modal dialog
	 * @details
	 * @requestParam string username
	 */
	public function getEmailConfirmationMarketingModal() {
		// TODO: need spam protection here HWL 2011-12-22
		$response = $this->userLoginHelper->sendConfirmationEmail( $this->request->getVal( 'username', '' ) );
		$this->result = $response['result'];
		$this->msg = $response['msg'];
	}

	/**
	 * @brief send confirmation email
	 * @resquestParam string username
	 * @resquestParam boolean byemail
	 * @responseParam string result [ok/error/invalidsession/confirmed]
	 * @responseParam string msg - result message
	 * @responseParam string msgEmail
	 * @responseParam string errParam
	 * @responseParam string heading
	 * @responseParam string subheading
	 */
	public function sendConfirmationEmail() {
		if( $this->request->getVal( 'format', '' ) !== 'json' ) {
			$this->wg->Out->setPageTitle( wfMessage( 'usersignup-confirm-page-title' )->plain() );
			$this->response->addAsset( 'extensions/wikia/UserLogin/css/UserSignup.scss' );
			$this->response->addAsset( 'extensions/wikia/UserLogin/css/ConfirmEmail.scss' );
			$this->response->addAsset( 'extensions/wikia/UserLogin/js/ConfirmEmail.js' );

			// hide things in the skin
			$this->wg->SuppressWikiHeader = true;
			$this->wg->SuppressPageHeader = true;
			$this->wg->SuppressFooter = true;
			$this->wg->SuppressAds = true;
			$this->wg->SuppressToolbar = true;
		}

		$this->username = $this->request->getVal( 'username', '' );
		$this->byemail = $this->request->getBool( 'byemail', false );

		// default heading, subheading, msg
		// depending on what happens, default will be over written below
		$mailTo = $this->username;
		$user = User::newFromName( $this->username );
		if ( $user instanceof User && $user->getID() != 0 ) {
			if ( ( isset( $_SESSION['notConfirmedUserId'] ) && $_SESSION['notConfirmedUserId'] == $user->getId() ) ) {
				$mailTo = $user->getEmail();
			}
		}

		$this->result = 'ok';
		$mailTo = htmlspecialchars( $mailTo );
		if ( F::app()->checkskin( 'wikiamobile' ) ) {
			$this->msg = wfMessage( 'usersignup-confirmation-email-sent-wikiamobile', $mailTo )->parse();
			$this->overrideTemplate( 'WikiaMobileSendConfirmationEmail' );
			$this->wg->Out->setPageTitle( wfMessage( 'usersignup-confirm-page-title-wikiamobile' )->plain() );
		} else {
			$this->heading = wfMessage( 'usersignup-confirmation-heading' )->escaped();
			$this->subheading = wfMessage( 'usersignup-confirmation-subheading' )->escaped();
			$this->msg = wfMessage( 'usersignup-confirmation-email-sent', $mailTo )->parse();
			$this->msgEmail = '';
			$this->errParam = '';

			if ( $this->wg->Request->wasPosted() ) {
				$action = $this->request->getVal( 'action','' );
				if ( $action=='resendconfirmation' ) {
					$response = $this->userLoginHelper->sendConfirmationEmail( $this->username );
					$this->result = $response['result'];
					$this->msg = $response['msg'];
					$this->heading = wfMessage( 'usersignup-confirmation-heading-email-resent' )->escaped();
				} else if ( $action == 'changeemail' ) {
					$this->email = $this->request->getVal( 'email', '' );
					$params = [
						'username' => $this->username,
						'email' => $this->email
					];

					$response = $this->sendSelfRequest( 'changeUnconfirmedUserEmail', $params );

					$this->result = $response->getVal( 'result','' );

					if( $this->result == 'ok' ) {
						$this->msg = $response->getVal( 'msg','' );
						$this->heading = wfMessage( 'usersignup-confirmation-heading-email-resent' )->escaped();
					} else if( $this->result == 'error' ) {
						$this->msgEmail = $response->getVal( 'msg','' );
						$this->errParam = $response->getVal( 'errParam', '' );
					} else if ( $this->result == 'confirmed' ) {
						$this->heading = wfMessage( 'usersignup-confirm-page-heading-confirmed-user' )->escaped();
						$this->subheading = wfMessage( 'usersignup-confirm-page-subheading-confirmed-user' )->escaped();
						$this->msg = $response->getVal( 'msg','' );
					}
				}

				// redirect to login page if invalid session
				if ( $this->result == 'invalidsession' ) {
					$titleObj = SpecialPage::getTitleFor( 'Userlogin' );
					$this->wg->out->redirect( $titleObj->getFullURL() );
					return;
				}
			} else {
				if ( $this->byemail == true ) {
					$this->heading = wfMessage( 'usersignup-account-creation-heading' )->escaped();
					$this->subheading = wfMessage( 'usersignup-account-creation-subheading', $mailTo )->escaped();
					$this->msg = wfMessage( 'usersignup-account-creation-email-sent', $mailTo, $this->username )->parse();
				}
			}
		}
	}

	/**
	 * @desc Sets validation status
	 *
	 * @param string $result validation result
	 * @param string $message validatation message
	 * @param $field
	 * @return bool
	 */
	private function setResponseFields( $result, $message, $field = false ) {
		$this->result = $result;
		$this->msg = $message;
		if ( $field !== false ) {
			$this->errParam = $field;
		}
		return false;
	}

	/**
	 * @desc Checks if the email is set and is valid and sets the proper response if not
	 *
	 * @param string $email Email address to check
	 * @return bool
	 */
	private function isValidEmailFieldValue( $email ) {
		// error if empty
		if ( empty( $email ) ) {
			return $this->setResponseFields(
				'error',
				wfMessage( 'usersignup-error-empty-email' )->escaped(),
				'email'
			);
		}

		// validate new email
		if ( !Sanitizer::validateEmail( $email ) ) {
			return $this->setResponseFields(
				'error',
				wfMessage( 'usersignup-error-invalid-email' )->escaped(),
				'email'
			);
		}
		return true;
	}

	/**
	 * @desc Checks if the username and sets the proper response if empty
	 *
	 * @param string $username
	 * @return bool
	 */
	private function isValidUsernameField( $username ) {
		if ( empty( $username ) ) {
			return $this->setResponseFields(
				'error',
				wfMessage( 'userlogin-error-noname' )->escaped(),
				'username'
			);
		}
		return true;
	}

	/**
	 * @desc Checks if user is valid and and sets the proper response if not
	 * @param User $user
	 * @return bool
	 */
	private function isValidUser( User $user ) {
		if ( $user instanceof User && $user->getID() != 0 ) {
			// break if user is already confirmed
			if ( !$user->getOption( UserLoginSpecialController::NOT_CONFIRMED_SIGNUP_OPTION_NAME ) ) {
				return $this->setResponseFields(
					'confirmed',
					wfMessage(
						'usersignup-error-confirmed-user', $user->getName(), $user->getUserPage()->getFullURL()
					)->parse(),
					'username'
				);
			}
		} else { // user doesn't exist
			return $this->setResponseFields(
				'error',
				wfMessage( 'userlogin-error-nosuchuser' )->escaped(),
				'username'
			);
		}
		return true;
	}

	/**
	 * @desc Checks if the the user session is valid and and sets the proper response if not
	 *
	 * @param $user
	 * @return bool
	 */
	private function isValidSession( $user ) {
		if ( !( isset( $_SESSION['notConfirmedUserId'] ) && $_SESSION['notConfirmedUserId'] == $user->getId() ) ) {
			return $this->setResponseFields(
				'invalidsession',
				wfMessage( 'usersignup-error-invalid-user' )->escaped(),
				'username'
			);
		}
		return true;
	}

	/**
	 * @desc Checks if the email change is below the set limit and sets the proper response if not
	 *
	 * @param $memKey
	 * @return bool
	 */
	private function isWithinEmailChangesLimit( $memKey ) {
		$emailChanges = intval( $this->wg->Memc->get( $memKey ) );
		if ( $emailChanges >= UserLoginHelper::LIMIT_EMAIL_CHANGES ) {
			return $this->setResponseFields(
				'error',
				wfMessage( 'usersignup-error-too-many-changes' )->escaped(),
				'email'
			);
		}
		return true;
	}

	/**
	 * @desc Checks if the email is within registrations per email limit and sets the proper response if not
	 *
	 * @param $email
	 * @return bool
	 */
	private function isWithinRegistrationPerEmailLimit( $email ) {
		if ( !UserLoginHelper::withinEmailRegLimit( $email ) ) {
			return $this->setResponseFields(
				'error',
				wfMessage( 'userlogin-error-userlogin-unable-info' )->escaped(),
				'email'
			);
		}
		return true;
	}

	/**
	 * @desc Checks if the user/email is blocked in phalanx and sets the proper response if so
	 *
	 * @param $user
	 * @return bool
	 */
	private function isBlockedByPhalanx( $user ) {
		$abortError = '';

		// abortNewAccount returns false if the user/email is blocked, true if they are not blocked
		$blockedByPhalanx = !PhalanxUserBlock::abortNewAccount( $user, $abortError );

		if ( $blockedByPhalanx ) {
			$this->setResponseFields(
				'error',
				$abortError,
				'email'
			);
		}

		return $blockedByPhalanx;
	}

	/**
	 * change user's email and send reconfirmation email
	 * @requestParam string username
	 * @requestParam string email
	 * @responseParam string result [ok/error/invalidsession/confirmed]
	 * @responseParam string msg - result messages
	 * @responseParam string errParam - error param
	 */
	public function changeUnconfirmedUserEmail() {
		// get new email from request
		$email = $this->request->getVal( 'email', '' );
		$username = $this->request->getVal( 'username' );

		if ( !( $this->isValidEmailFieldValue( $email ) && $this->isValidUsernameField( $username ) ) )	{
			return;
		}

		$user = User::newFromName( $username );

		if ( !( $this->isValidUser( $user ) && $this->isValidSession( $user ) ) ) {
			return;
		}

		// check email changes limit
		$memKey = wfSharedMemcKey( 'wikialogin', 'email_changes', $user->getId() );

		// CONN-471: Respect the registration per email limit
		if ( !( $this->isWithinEmailChangesLimit( $memKey ) && $this->isWithinRegistrationPerEmailLimit( $email ) ) ) {
			return;
		}

		// increase counter for email changes
		$this->userLoginHelper->incrMemc( $memKey );

		$this->setResponseFields(
			'ok',
			wfMessage( 'usersignup-reconfirmation-email-sent', $email )->escaped()
		);
		if ( $email != $user->getEmail() ) {
			$user->setEmail( $email );

			// CONN-471: Call AbortNewAccount to validate username/password with Phalanx
			if ( $this->isBlockedByPhalanx( $user ) ) {
				return;
			}

			// send reconfirmation email
			$result = $user->sendReConfirmationMail();

			$user->saveSettings();

			// set counter to 1 for confirmation emails sent
			$memKey = $this->userLoginHelper->getMemKeyConfirmationEmailsSent( $user->getId() );
			$this->wg->Memc->set( $memKey, 1, 24*60*60 );

			if( !$result->isGood() ) {
				$this->setResponseFields(
					'error',
					wfMessage( 'userlogin-error-mail-error', $result->getMessage() )->parse()
				);
			}
		}
	}

	/**
	 * validate form
	 * @requestParam string field [userloginext01/userloginext02/email/birthdate]
	 * @requestParam string userloginext01 //CE-413 signup spam attack - changing username field to userloginext01
	 * @requestParam string email
	 * @requestParam string userloginext02 //CE-413 signup spam attack - changing password field to userloginext02
	 * @requestParam string birthmonth
	 * @requestParam string birthday
	 * @requestParam string birthyear
	 * @responseParam string result [ok/error]
	 * @responseParam string msg - result message
	 * @responseParam string errParam - error param
	 */
	public function formValidation() {
		$field = $this->request->getVal( 'field', '' );
		$signupForm = new UserLoginForm( $this->wg->request );
		$signupForm->load();

		switch( $field ) {
			case 'userloginext01' :
				$response = $signupForm->initValidationUsername();
				break;
			case 'userloginext02' :
				$response = $signupForm->initValidationPassword();
				break;
			case 'email' :
				$response = $signupForm->initValidationEmail()
					&& $signupForm->initValidationRegsPerEmail();
				break;
			case 'birthdate' :
				$response = $signupForm->initValidationBirthdate();
				break;
		}

		$this->result = ( $signupForm->msgType == 'error' ) ? $signupForm->msgType : 'ok' ;
		$this->msg = $signupForm->msg;
		$this->errParam = $signupForm->errParam;
	}

	private function disableCaptcha() {
		global $wgHooks;

		$isMobile = $this->app->checkSkin( 'wikiamobile' );
		$isAutomatedTest = in_array( $this->wg->Request->getIP(), $this->wg->AutomatedTestsIPsList );
		$isNoCaptchaTest = $this->wg->Request->getInt( 'nocaptchatest' ) == 1;

		//Disable captcha for automated tests and wikia mobile
		if ( $isMobile || ( $isAutomatedTest && $isNoCaptchaTest ) ) {
			//Switch off global var
			$this->wg->WikiaEnableConfirmEditExt = false;
			//Remove hook function
			$hookArrayKey = array_search( 'ConfirmEditHooks::confirmUserCreate', $wgHooks['AbortNewAccount'] );
			if ( $hookArrayKey !== false ) {
				unset( $wgHooks['AbortNewAccount'][$hookArrayKey] );
			}
			$this->wg->Out->addJsConfigVars( [
				'wgUserLoginDisableCaptcha' => true
			] );
		}
	}

}
