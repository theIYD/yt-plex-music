const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ssh = require("node-ssh");
const rimraf = require("rimraf");
const dotenv = require("dotenv").config();

const getMp4 = obj => {
  return new Promise((resolve, reject) => {
    let folderPath = path.join(__dirname, `/temp/${obj.foldername}/`);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    // Get the temporary mp4 file path
    let filename = `tmp_${obj.filename}.mp4`;
    let filePath = folderPath + filename;

    // The stream object
    let audioStreamObject = ytdl(obj.url, { filter: "audioonly" });

    // Listen for progress
    audioStreamObject.on("progress", (chunkLength, downloaded, total) => {
      let downloadedPercentage = Math.floor((downloaded / total) * 100);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(
        `Progress: ${downloaded}/${total} - ${downloadedPercentage}%`
      );
    });

    audioStreamObject.pipe(fs.createWriteStream(filePath)).on("finish", () => {
      resolve({
        folderPath: folderPath,
        filePath: filePath,
        filename: `${obj.filename}.mp3`
      });
    });
  });
};

const convertMp3ToMp4 = obj => {
  return new Promise((resolve, reject) => {
    // Use ffmpeg for conversion
    ffmpeg(obj.filePath)
      .withAudioCodec("libmp3lame")
      .toFormat("mp3")
      .on("progress", progress => {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`Progress: ${Math.floor(progress.percent)}%`);
      })
      .output(fs.createWriteStream(path.join(obj.folderPath, obj.filename)))
      .on("end", () => {
        fs.unlink(obj.filePath, err => {
          if (err) {
            console.error(err);
          }
        });
        resolve({
          done: true,
          folderPath: obj.folderPath,
          filePath: obj.folderPath + obj.filename
        });
      })
      .run();
  });
};

const doSSH = paths => {
  return new Promise(async (resolve, reject) => {
    let sshInstance = new ssh();

    try {
      let connection = await sshInstance.connect({
        host: process.env.HOST,
        username: process.env.USERNAME,
        password: process.env.PASSWORD
      });

      let directoryCreated = await sshInstance.mkdir(
        `/home18/${process.env.USERNAME}/media/Music/${paths.folderName}`
      );

      let status = await sshInstance.putDirectory(
        `${paths.folderPath}`,
        `/home18/${process.env.USERNAME}/media/Music/${paths.folderName}/`
      );

      if (status) {
        rimraf(paths.folderPath, function() {
          console.log("done");
          resolve({ status });
        });
      }
    } catch (err) {
      console.error(err);
    }
  });
};

module.exports = {
  getMp4,
  convertMp3ToMp4,
  doSSH
};
