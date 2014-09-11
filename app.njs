module.exports = function setCredentials(gDriveCredentials) {

   var google = require('googleapis'),
       credentials = gDriveCredentials;
       Promise = require('promise'),
       _ = require('underscore'),
       url = require('url');
       require('string.prototype.endswith');

   var drive = google.drive({
      version: 'v2',
   })

   var jwt = new google.auth.JWT(credentials['client_email'], null,
    credentials['private_key'], ['https://www.googleapis.com/auth/drive']);

   var jwtAuthorize = Promise.denodeify(jwt.authorize).bind(jwt);
   var getFileInfo = Promise.denodeify(drive.files.get);

   /**
    * Get short-lived links for gdrive images.
    *
    * @param options hash:
    *
    * @param options.webContentType string: 'download' | 'view'.
    *   default: 'view'
    *   This parameter specifies what type of link stored in the
    *   `webContentLink` field of the return hash shold be returned. This link
    *   is a full-sized image link. If downlaod is specified, the user will get the
    *   image downloaded upon visiting the url, if view, the image will appear
    *   in-browser.
    *
    * @param options.thumnail<Dimension>: only specify one of the following:
    *  default: none (don't change the default dimensions (s=220, currently))
    *
    * @param options.thumnailHeight int/string: specify the height that
    *  you want the image scaled to. (width is scaled correspondingly)
    * @param options.thumnailWidth int/string: specify the width that
    *  you want the image scaled to. (height is scaled correspondingly)
    * @param options.thumbnailSize int/string: specify the 's' (size?) that
    *  you want the image scaled to. Google defaults this to 220. A smaller 's'
    *  is a smaller image.
    *
    * @param options.fileId string: the google drive fileId of a publically
    *  viewable image.
    *
    * Note: from playing around it looks like google won't scale your image too
    *  large.
    *
    * @return: promise for hash of {webContentLink, thumbnailLink}
    */
   function getLinks(userOptions) {
      var options = _.defaults({}, userOptions, defaultOptions);

      if (!authed) {
         var authP = jwtAuthorize().then(function() {
            authed = true;
         });
      } else {
         var authP = Promise.resolve();
      }

      return authP.then(function() {
         return getFileInfo({
            auth: jwt,
            fileId: options.fileId,
         }).then(adjustLinks);
      });

      function adjustLinks(fileInfo) {
         var parsedWebContentUrl = url.parse(fileInfo.webContentLink, true);
         var parsedThumbnailUrl = url.parse(fileInfo.thumbnailLink, true);

         if (!parsedThumbnailUrl.pathname.endsWith('=s220')) {
            throw new Exception('unexpected pathname: ' +
             parsedThumbnailUrl.pathname);
         }

         // nodejs.org/api/url.html
         // query (object; see querystring) will only be used if search is absent.
         delete parsedWebContentUrl.search;
         parsedWebContentUrl.query.export = options.webContentType;

         if (options.thumbnailWidth !== undefined) {
            parsedThumbnailUrl.pathname = parsedThumbnailUrl.pathname
             .substr(0, parsedThumbnailUrl.pathname.length - 4) +
             'w' + options.thumbnailWidth;
         } else if (options.thumbnailHeight !== undefined) {
            parsedThumbnailUrl.pathname = parsedThumbnailUrl.pathname
             .substr(0, parsedThumbnailUrl.pathname.length - 4) +
             'h' + options.thumbnailHeight;
         } else if (options.thumbnailSize !== undefined) {
            parsedThumbnailUrl.pathname = parsedThumbnailUrl.pathname
             .substr(0, parsedThumbnailUrl.pathname.length - 4) +
             's' + options.thumbnailSize;
         }

         return {
            webContentLink: url.format(parsedWebContentUrl),
            thumbnailLink: url.format(parsedThumbnailUrl),
         };
      }
   }
   var authed = false;
   var defaultOptions = {
      webContentType: 'view',
   // thumbnailWidth: undefined,
   // thumbnailHeight: undefined,
   // thumbnailSize: undefined,
   };

   /**
    * If you're into this sort of thing... takes a second parameter
    *  callback(err, linksHash)
    */
   var getLinksNode = Promise.nodeify(getLinks);

   return {
      getLinks: getLinks,
      getLinksNode: getLinksNode,
   };
};

