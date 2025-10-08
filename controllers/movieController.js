import Movie from "./../models/movieModel.js";
import catchAsync from "./../utils/catchAsync.js";
import AppError from "./../utils/appError.js";
import ComparaDescrieriMpnet_Minilm from "./../utils/sentenceTransformers.js";
//NEW:
import { getMovieTMDB } from "./similarController.js";

const getAllMovies = catchAsync(async (req, res, next) => {
  const movies = await Movie.find();

  if (!movies) {
    return next(new AppError("No movies in DB", 404));
  }

  // Verifică dacă ruta este /similarity/:movie
  if (req.originalUrl.includes("/similarity/")) {
    // Dacă da, salvează filmele în res.locals
    res.locals.movies = movies;
    // Continuă cu următorul handler
    return next();
  }

  res.status(200).json({
    status: "success",
    requestedAt: req.requestTime,
    results: movies.length,
    data: {
      movies,
    },
  });
});

const getMovie = catchAsync(async (req, res, next) => {
  const movie = await Movie.findById(req.params.id);

  if (!movie) {
    return next(new AppError("No movie found with that ID", 404));
  }

  if (req.originalUrl.includes("/similarity/")) {
    // Dacă da, salvează filmele în res.locals
    res.locals.movieDB = movie;
    // Continuă cu următorul handler
    return next();
  }

  res.status(200).json({
    status: "success",
    data: {
      movie,
    },
  });
});

const findMovieByApiId = async (api_id) => {
  return await Movie.findOne({ api_id });
};

const getSimilarMovie = catchAsync(async (req, res, next) => {
  //1. get movie din DB nostru
  let movie = await findMovieByApiId(req.params.movie);

  //1.1 exista acest movie in DB nostru? daca nu cautam movie in TMDB dB
  if (!movie) {
    movie = await getMovieTMDB(req.params.movie);
  }

  //2. Are acest movie din DB deja calculat obiectul similar? DA? TRECEM LA MIDDLEWARE URMATOR(updateMovies)
  //2.1 De asemenea similar a fost ultima data calculat acum o luna?
  //const now = new Date(now);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  console.log("movie:" + JSON.stringify(movie));
  const updatedAt = new Date(movie.similar_updatedAt);
  if (
    movie.similar &&
    movie.similar.length > 0 &&
    movie.similar_updatedAt &&
    updatedAt >= oneMonthAgo
  ) {
    //obtinem ordinea dorita la id(asta pentru ca similaritatea sa fie plasata corect pt client):
    const similarityMap = movie.similar.reduce((acc, { _id, similarity }) => {
      acc[_id.toString()] = similarity;
      return acc;
    }, {}); //dictionar { id_string:similarity}
    //query in db, acesta va avea o ordine aleatorie, de aceea e necesar orderedIds
    const filmeSimilareRaw = await Movie.find({
      _id: { $in: movie.similar },
    });
    console.log("🟥🟥🟥🟥🟥🟥🟥🟥🟥 --- 11111");
    console.log(JSON.stringify(filmeSimilareRaw));
    //reordonam noi manual:
    const orderedIds = movie.similar.map((f) => f._id.toString());
    const filmeSimilare = orderedIds.map((id) => {
      const film = filmeSimilareRaw.find((f) => f._id.toString() === id);
      if (!film) return null;
      return {
        ...film.toObject(),
        similarity: similarityMap[id],
      };
    }).filter(Boolean);
    //salvam datele local
    res.locals.filme_similare = filmeSimilare;
    res.locals.movie = movie;
    return next();
  }
  console.log("🟥🟥🟥🟥🟥🟥🟥🟥🟥 --- 22222");

  //3. Obiectul similar este gol, deci continuam cu algo gasit filme similare
  //3.1 luam toate filmele din DB
  const movies = res.locals.movies;

  //3.2 Algo in sine, prin care vom obtine filme_similare
  let filme_similare = await ComparaDescrieriMpnet_Minilm(movie, movies);

  //4. Nu am gasit nici un film similar. NE OPRIM SI TRIMITEM RASPUNS
  if (!filme_similare || filme_similare.length === 0) {
    //daca nu gasim filme similar pentru un film care nu il avem in db, nu il vom adauga in db.
    //e ok asta? vrem db sa aibe cat mai multe filme sau cat mai multe filme care au similar[]
    return res.status(404).json({
      status: "fail",
      message: `No similar movie found for ${movie.api_id}`,
    });
  }
  console.log("🟥🟥🟥🟥🟥🟥🟥🟥🟥 --- 333333");
  //5 salvam filme_similare si movie.id in locals pentru pasul MIDDLEWARE URMATOR(updateMovies)
  res.locals.filme_similare = filme_similare;
  res.locals.movie = movie;
  return next();
});

const updateMovies = catchAsync(async (req, res, next) => {
  let filme_similare = res.locals.filme_similare;
  let movie = res.locals.movie;

  console.log("🟥 --- Verificare inițială");
  console.log(JSON.stringify(movie));
  const filmDinDB = await Movie.findOne({ api_id: movie.api_id });

  //DRY:
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  console.log("movie.similar_updatedAt" + movie.similar_updatedAt);
  console.log("oneMonthAgo" + oneMonthAgo);
  const updatedAt = new Date(movie.similar_updatedAt);

  if (!filmDinDB) {
    // 🔴 SCENARIUL 1: Filmul nu există în DB — Îl creăm complet
    const movieData = {
      api_id: `${movie.api_id || movie.id}`,
      title: movie.title,
      overview: movie.overview,
      popularity: movie.popularity,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      release_date: movie.release_date,
      genres: movie.genre_ids,
      similar_updatedAt: Date.now(),
      similar: filme_similare.map((film) => ({
        _id: film._doc?._id || film._id,
        similarity: film.similarity,
      })),
    };

    const newDoc = await Movie.create(movieData);
    console.log("🟢 Film nou creat");
  } else if (
    !Array.isArray(filmDinDB.similar) ||
    filmDinDB.similar.length === 0 ||
    filmDinDB.similar_updatedAt == null || 
    updatedAt <= oneMonthAgo)
  {
    // 🟠 SCENARIUL 2: Filmul există, dar `similar` lipsește sau e gol — Îl completăm
    const updatedDoc = await Movie.findOneAndUpdate(
      { api_id: `${movie.api_id || movie.id}` },
      {
        $set: {
          similar: filme_similare.map((film) => ({
            _id: film._doc?._id || film._id,
            similarity: film.similarity,
          })),
          similar_updatedAt: Date.now(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );
    console.log("🟡 Film existent, dar am adăugat similar");
  } else {
    // 🟢 SCENARIUL 3: Filmul există și are deja similar — Trimitem similar ca response acum, nu filme_similare
    //asta pentru a putea lua si numarul de similaritate.
    console.log("🟢 Filmul are deja similar — nu modificăm nimic");
  }

  res.status(200).json({
    status: "success",
    data: {
      filme_similare,
    },
  });
});

const movieController = {
  getMovie,
  getAllMovies,
  getSimilarMovie,
  updateMovies,
};

export default movieController;
