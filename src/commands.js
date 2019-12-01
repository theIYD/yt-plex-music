#!/usr/bin/env node
const program = require("commander");
const { prompt } = require("inquirer");

const { getMp4, convertMp3ToMp4 } = require("../index");

const questions = [
  {
    type: "input",
    name: "url",
    message: "Video URL:"
  },
  {
    type: "input",
    name: "filename",
    message: "Filename:"
  },
  {
    type: "input",
    name: "foldername",
    message: "Folder:"
  }
];

// Version
program.version("1.0.0").description("Upload music to Plex server");

// add - command for adding a new url
program
  .command("add")
  .alias("a")
  .description("Add a url")
  .action(async () => {
    try {
      let answers = await prompt(questions);
      if (answers) {
        let resultantPaths = await getMp4(answers);
        if (resultantPaths) {
          console.log("\nConverting.....");
          let result = await convertMp3ToMp4(resultantPaths);
          if (result.done) {
            console.log("\nConversion done. File saved.");
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  });
program.parse(process.argv);
