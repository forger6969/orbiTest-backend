const { default: mongoose } = require("mongoose");

const programmSchema = mongoose.Schema({
  programmTitle: {
    type: String,
    required: [true, "Название программы обучения обязательно!"],
  },
});
