import express from 'express';
import movieController from './../controllers/movieController.js';

const router = express.Router();

// router.param('id', tourController.checkID);

router
  .route('/similarity/:movie')
  .get(movieController.getAllMovies, movieController.getSimilarMovie, movieController.updateMovies);

router
  .route('/')
  .get(movieController.getAllMovies);
router
  .route('/:id')
  .get(movieController.getMovie);

export default router;
