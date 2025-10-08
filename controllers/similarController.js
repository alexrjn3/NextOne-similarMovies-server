const API_KEY =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4MjE2MzUzYzA5YzNlZTQ3MTAyNGU5ZTBjMWNiZDhlNyIsIm5iZiI6MTcxMzAyMzM1Mi45ODIsInN1YiI6IjY2MWFhOTc4OTgyZjc0MDE2MzQ2YTI1OCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ZY03XoHzOtq6AjHoRBU9rcY2A-Zyw_ca_gJc86XGfog";

const options = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};

// const searchMovie = async function (movie_name) {
//   try {
//     const response = await fetch(
//       `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
//         movie_name
//       )}`,
//       options
//     );
//     const data = await response.json();

//     if (data.results && data.results.length > 0) {
//       const firstMovie = data.results[0];
//       console.log("First movie result:", firstMovie);
//       return firstMovie;
//     } else {
//       console.log("No movies found.");
//       return null;
//     }
//   } catch (err) {
//     console.log(err);
//   }
// };

//De mutat in alt modul:
export const getMovieTMDB = async function (movieId) {
  try {
    //luam movie overview prin trimitere parametru movie.id:
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}`,
      options
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};
