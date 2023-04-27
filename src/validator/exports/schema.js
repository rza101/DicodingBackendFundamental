const Joi = require('joi');

const ExportNotesPayloadSchema = Joi.object({
    targetEmail: Joi.string().email({ tlds: { allow: true } }).required(),
});

module.exports = ExportNotesPayloadSchema;