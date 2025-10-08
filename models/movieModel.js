import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  api_id: {
    type: Number,
    required: [true, 'A movie must have a api id'],
    unique: true,
  },
  title: {
    type: String,
    required: [true, 'A movie must have a title'],
  },
  overview: {
    type: String,
    // required: [true, 'A movie must have an overview']
  },
  popularity:{
    type: Number,
    // required: [true, 'A movie must have a popularity'],
    default: 0,
  },
  poster_path: {
    type: String,
    //required: [true, 'A movie must have a poster path']
  },
  vote_average:{
    type:Number,
    //required: [true, 'A movie must have a vote average']
  },
  vote_count: {
    type: Number,
    //required: [true, 'A movie must have a vote count'],
  },
  release_date: {
    type: Date,
    default: Date.now(),
    //required: [true, 'A movie must have a release date']
  },
  genres: [Number],
  similar_updatedAt: {
      type: Date,
      default: null,
  },
  similar: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Movie',
        required: true
      },
      similarity: {
        type:Number,
        required: true
      }
    }
  ]
});

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
