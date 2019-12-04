const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ssh = require("node-ssh");
const rimraf = require("rimraf");
const dotenv = require("dotenv").config();

// Get the mp4 file from Youtube
const getMp4 = obj => {
  return new Promise((resolve, reject) => {
    let folderPath = path.join(__dirname, `/${obj.foldername}/`);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    // Get the temporary mp4 file path
    let filename = `tmp_${obj.filename}.mp4`;
    let filePath = folderPath + filename;

    // The stream object
    let audioStreamObject = ytdl(obj.url, {
      quality: "highestaudio",
      filter: "audioonly"
    });

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

// Convert to mp3 using ffmpeg
const convertToMp3 = obj => {
  return new Promise((resolve, reject) => {
    // Use ffmpeg for conversion
    ffmpeg(obj.filePath)
      .withAudioCodec("libmp3lame")
      .withAudioBitrate(320)
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

// SSH into the server and place the mp3 file
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
        `${process.env.MUSIC_SERVER_DIR}/${paths.folderName}`
      );

      let status = await sshInstance.putDirectory(
        `${paths.folderPath}`,
        `${process.env.MUSIC_SERVER_DIR}/${paths.folderName}/`
      );

      if (status) {
        rimraf(paths.folderPath, function() {
          resolve({ status });
        });
      }
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
};

module.exports = {
  getMp4,
  convertToMp3,
  doSSH
};
