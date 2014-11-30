##express-bnet-auth
Authentication Express Middleware for use with Battle.net OAuth login.

Work In Progress

##Installation
`npm install express-bnet-auth --save`

###Usage
```
var bnetOptions = {
  BNET_ID: 'YOUR BNET KEY',
  BNET_SECRET: 'YOUR BNET SECRET',
  CALLBACK_URL: 'https://localhost:8443/auth/bnet/callback'
};

var bnet = require('express-bnet-auth')(bnetOptions);
/*
 * Routes
 */
app.get('/auth/bnet', bnet.auth);

app.get('/auth/bnet/callback', bnet.callback, function (req, res) {
  if(req.error){
    return res.send('The following error occurred when logging into battle.net: %s', req.error);
  }

  return res.send('Your token data is: %s', JSON.stringify(req.token_data));
});
```

###Changelog
0.0.3 Usage examples
0.0.2 Bug Fix