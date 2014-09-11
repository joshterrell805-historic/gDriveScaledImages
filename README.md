### Example

```js
var getLinks = require('gDriveScaledImages').getLinks;

var linksP = getLinks({
   fileId: 'some public google drive image fileid',
   thumbnailWidth: 400, // px
   webContentType: 'view', // view or download, view is default
});

linksP.done(function(hash) {
   console.log(hash);
   /*
      {
         'thumbnailLink': 'some url to a temporary link of your scaled image at 400 px in width',
         'webContentLink': 'a url to a full-sized version of your image'
      }
   */
});
```
