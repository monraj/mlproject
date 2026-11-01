// Adds the Pixel Watch app (mobile/wear) and its watch face (mobile/watchface) to the Android
// Gradle build, so prebuild keeps them.
const { withSettingsGradle } = require('expo/config-plugins');

module.exports = function withWearModule(config) {
  return withSettingsGradle(config, (c) => {
    if (!c.modResults.contents.includes("include ':wear'")) {
      c.modResults.contents += "\ninclude ':wear'\nproject(':wear').projectDir = new File(rootDir, '../wear')\n";
    }
    if (!c.modResults.contents.includes("include ':watchface'")) {
      c.modResults.contents += "\ninclude ':watchface'\nproject(':watchface').projectDir = new File(rootDir, '../watchface')\n";
    }
    return c;
  });
};
