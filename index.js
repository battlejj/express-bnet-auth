var qs = require('querystring');
var request = require('request');
var uuid = require('node-uuid');

module.exports = function(options){
  var BNET_ID = options.BNET_ID || process.env.BNET_ID || '';
  var BNET_SECRET = options.BNET_SECRET || process.env.BNET_SECRET || '';
  var REGION = options.REGION || 'us';
  var SCOPE = options.SCOPE || 'wow.profile';

  var CALLBACK_URL = options.CALLBACK_URL || function(){ throw new ConfigurationException(
      'Your battle.net authentication call has no CALLBACK_URL. This is required in order to know ' +
      'where to redirect battle.net after authentication attempts.'
    );
    };

  return {
    auth: function(req, res){
      if(!req.query.region){
        req.query.region = REGION;
      }

      if(!req.query.scope){
        req.query.scope = SCOPE;
      }

      if(!req.session){
        throw new ConfigurationException('Sessions must be enabled to use express-bnet-auth middleware.');
      }

      req.session.bnet_state = req.query.scope + ':' + req.query.region + ':' + uuid.v4();

      var params = qs.stringify({
        client_id: BNET_ID,
        scope: req.query.scope,
        state: req.session.bnet_state,
        redirect_uri: CALLBACK_URL,
        response_type: 'code'
      });

      res.redirect('https://' + req.query.region + '.battle.net/oauth/authorize?' + params);
    },
    callback: function(req, res, next){
      var scope, region, token_params;

      //User Declined Access
      if(req.query.error && req.query.error === 'access_denied'){
        req.token_data = null;
        req.error = {error: req.query.error, error_description: req.query.error_description};
        return next();
      }

      if(!req.query.state){
        req.token_data = null;
        req.error = {
          error: 'Invalid battle.net response.',
          error_description: 'Did not receive a state query parameter from battle.net. This is unusual.'
        };
        return next();
      }

      if(!req.session.bnet_state || req.session.bnet_state !== req.query.state){
        req.token_data = null;
        req.error = {
          error: 'Invalid battle.net response.',
          error_description: 'State query parameters do not match. This may be caused by a 3rd party trying to exploit.'
        };
        return next();
      }

      try {
        scope = req.query.state.split(':').length ? req.query.state.split(':')[0] : SCOPE;
        region = req.query.state.split(':').length ? req.query.state.split(':')[1] : REGION;

      } catch(e){
        scope = SCOPE;
        region = REGION;
      }

      token_params = qs.stringify({
        client_id: BNET_ID,
        client_secret: BNET_SECRET,
        code: req.query.code,
        scope: scope,
        grant_type: 'authorization_code',
        redirect_uri: CALLBACK_URL
      });

      request('https://' + region + '.battle.net/oauth/token?' + token_params, function(error, response, body){
        //Catch Request Errors First
        if(error) {
          req.error = {error: error, error_description: 'Error reaching battle.net servers.'};
          return next();
        } else {
          try {
            var parsedResponse = JSON.parse(body);
            if(parsedResponse.error){
              req.token_data = null;
              req.error = parsedResponse;
            } else {
              req.token_data = parsedResponse;
            }
          } catch(e){
            req.token_data = null;
            req.error = {
              error: 'Invalid battle.net response.',
              error_description: 'Response to BNET_CALLBACK_URL expected JSON and received: ' + body
            };
          }
        }

        return next();
      });
    }
  }


};

function ConfigurationException(message){
  this.message = message;
  this.name = 'ExpressBnetAuthException';
}

ConfigurationException.prototype.toString = function (){
  return this.name + ': "' + this.message + '"';
};