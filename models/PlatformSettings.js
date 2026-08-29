const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    commissionPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

platformSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ commissionPercent: 10 });
  }
  return settings;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
