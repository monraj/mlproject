// Adds the Pixel Watch app (mobile/wear) to the Android Gradle build, so prebuild keeps it.
const { withSettingsGradle } = require('expo/config-plugins');

module.exports = function withWearModule(config) {
  return withSettingsGradle(config, (c) => {
    if (!c.modResults.contents.includes("include ':wear'")) {
      c.modResults.contents += "\ninclude ':wear'\nproject(':wear').projectDir = new File(rootDir, '../wear')\n";
    }
    return c;
  });
};
