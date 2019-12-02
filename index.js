const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");

const getMp4 = obj => {
  return new Promise((resolve, reject) => {
    // Get the temporary mp4 file path
    let filename = `tmp_${obj.filename}.mp4`;
    let folderPath = path.join(__dirname, `/temp/`);
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
        resolve({ done: true });
      })
      .run();
  });
};

module.exports = {
  getMp4,
  convertMp3ToMp4
};
