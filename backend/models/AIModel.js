const mongoose = require('mongoose');

const AIModelSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Nome amigável (ex: "Gemini 1.5 Flash")
  modelId: { type: String, required: true, unique: true }, // ID técnico (ex: "gemini-1.5-flash")
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  description: { type: String }
}, { timestamps: true });

// Garante que apenas um modelo seja o padrão por vez
AIModelSchema.pre('save', async function() {
  if (this.isDefault) {
    await this.constructor.updateMany({ _id: { $ne: this._id } }, { isDefault: false });
  }
});

module.exports = mongoose.model('AIModel', AIModelSchema);
