const fs = require("fs");

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    // unlink() method is used to delete a file from the file system, it takes the
    // path of the file to be deleted and a callback function that will be called after
    // the file is deleted or if there is an error while deleting the file.
    console.log("Deleted file:", filePath);

    if (err) {
      throw err;
    }
  });
};

exports.deleteFile = deleteFile;
