LDAP sync
=========================

The goal of this software is to synchronize changes between LDAP and miscellaneous backends like redmine and google apps.

Installation
------------

You can install this software using npm into a global context:

       sudo npm install git+https://github.com/conversionscience/ldap-sync.git -g

Configuration
-------------

The *ldap-sync* binary will search config in */etc/ldap-sync/config.json* and will raise an error if import failed.

The config file consisits of five sections and could be:

    {
      "connection": {
        "uri": "ldap://localhost"
      },
      "bind": {
        "binddn": "cn=Manager,dc=domain,dc=com",
        "password": "password"
      },
      "sync": {
        "base": "ou=People,dc=domain,dc=com",
        "scope": 1,
        "filter": "(objectClass=posixAccount)"
      },
      "log": {
        "file": {
          "timestamp": true,
          "maxsize": 1.0737418E+10,
          "json": false,
          "tailable": true,
          "filename": "/var/log/ldap-sync.log",
          "level": "info"
        }
      },
      "backends": [
        {
          "plugin": "google-apps",
          "config": {
            "domain": "domain.com",
            "serviceEmail": "76...ar4@developer.gserviceaccount.com",
            "keyFile": "/etc/ldap-sync/key.pem",
            "accountEmail": "admin@domain.com"
          }
        }
      ]
    }

The ```connection```, ```bind``` and ```sync``` section are stright copies of parameters for the ```new```, ```simplebind``` and ```sync``` of https://github.com/jeremycx/node-ldap methods respectively.

The ```log``` entry is used for configuration of application logging. There are two supported ways at this moments: *file* and *mail*. Config parameters are identical to winston logger. Sample config for mail logger and google mailer is:

    {
      "host": "smtp.gmail.com",
      "port": 465,
      "ssl": true,
      "username": "admin@domain.com",
      "password": "application password",
      "subject": "LDAP sync error: domain.com",
      "from": "admin@domain.com",
      "to": "admin@domain.com",
      "level": "error"
    }

Please note: if you use two factor authorization for google apps you'll need to create a special application password and use it here.

The ```backends``` options consists of an array of backends to sync object informat with two required properties: ```plugin``` (the name of plugin) and ```config``` — config parameters for plugin. Each default config parameters could be found inside plugin directory.

Plugins
-------

### console

Simple plugin used for debugging, it will dump event name and sync object to console.

### redmine

Plugin used for synchronization between LDAP and LDAP-driven redmine installation. Sample config is:

    {
      "url": null,
      "key": null,
      "auth_source_id": 0,
      "domain": null
    }

where:
* ```url``` is a network path to redmine installation, like *http://redmine.org*;
* ```key``` is an redmine API key for *admin* user;
* ```auth_source_id``` is a number for corresponding LDAP auth source configured in redmine. It can be found inside *LDAP authentication* entry in admin section.
* ```domain``` is a default domain used for construction email entries when synced user has no email field in LDAP.

### google-apps

Plugin could be used for synchronization between LDAP and google apps driven email. Sample config is:

    {
      "domain": "domain.com",
      "serviceEmail": "76...ar4@developer.gserviceaccount.com",
      "keyFile": "/etc/ldap-sync/key.pem",
      "accountEmail": "admin@domain.com"
    }

where:
* ```domain`` is an applications domain
* ```serviceEmail``` is given after application key create
* ```keyFile``` is a *pem* certificate provided by google
* ```accountEmail``` is user email which will be used as an admin (with corresponding permissions)

How to obtain certificate and other stuff from google:

1. You must log into  developer console and create a project here: https://console.developers.google.com/project
2. Then go to «APIs» section and add *Admin SDK*, the rest could be removed.
3. Navigate to «Credentials section and create new Client ID (pick Service Account). Your settings json file will be automatically downloaded. I'd recommend you to create a new p12 key file (it will go as an *.p12 from beginning) and delete previous one.
4. Now you need to convert p12 certificate to pem:
       openssl pkcs12 -in your-certificate.p12 -nocerts -passin pass:notasecret -nodes -out key.pem
and put the resulting file somewhere on fs — the path will be used in configuration.
5. Next is to give this Client ID permissions. Go to your domain admin and click on «Security» chapter, pick the «Advanced settings» (you may need to click «Show more» link) and choose «Manage API client access» in the opened list. Put into «Cliend ID» field value obtained from client json downloaded after client ID creation, usually it looks like a domain name:    ```50...287-khq...ehr4.apps.googleusercontent.com```. Fill the «API scopes» field with the next text: ```https://www.googleapis.com/auth/admin.directory.user,https://www.googleapis.com/auth/admin.directory.user.security``` and press «Authorize». You're done with google apps setup.
