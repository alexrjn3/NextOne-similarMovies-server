import { pipeline, env } from '@huggingface/transformers';

// Dynamically import the Transformers.js library
const extractorPromiseMiniLM = pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2",
  {
    dtype: 'q8' // Use quantized model if supported
  }
);

const extractorPromiseMpnet = pipeline(
  "feature-extraction",
  "Xenova/all-mpnet-base-v2",
  { dtype: 'q8' }
);

let extractor=null;
let selected_choice;
let filme_similare = [];
let movie_file;

//de mutat in util dupa
let choice_minilm = {
  name: "minilm",
  value: 0.30,
};
let choice_mpnet = {
  name: "mpnet",
  value: 0.39,
};

const sortareAfisareFilme_si_slice = function(vector){

  //1. Filtru filme cu vote_count peste 1000
  vector = vector.filter(movie => movie._doc.vote_count > 200);

  //2. Sortare prin similarity descrescator
  vector.sort((a, b) => b.similarity - a.similarity);

  //3. Slice
    if (vector.length > 0 && vector[0]._doc.api_id == `${movie_file.api_id || movie_file.id}`) {
    vector = vector.slice(1, 7); // excludem primul
  } else {
    vector = vector.slice(0, 6); // păstrăm top 6
  }

  console.log("Ranking:");
  //4. Afisare rez
  for (const movie of vector) {
    // console.log(`Title: ${movie._doc.title}`);
    // console.log(`Similarity: ${movie.similarity}`);
    // console.log(`Overview: ${movie._doc.overview}\n`);
  }
  return vector;
}

const retinere_AfisareRezultat = function(cosineSimilarity,movie){
      if (cosineSimilarity > selected_choice.value) {
        // console.log(`Found similar movie: ${movie.title || movie._doc.title}`);
        // console.log(`Description: ${movie.overview || movie._doc.overview}`);
        // console.log(`Similarity: ${cosineSimilarity}`);
        filme_similare.push({...movie, similarity: cosineSimilarity});
      }
}

const calculCosineMpnet = async function(embedding1, movies){
  for (let i = 0; i < movies.length; i++) {
      const raw2 = await extractor(movies[i]._doc.overview, { pooling: 'mean', normalize: true });
      const embedding2 = raw2.data;

      // Compute cosine similarity between the original movie and the current movie in the array
      const cosineSimilarity = dotProduct(embedding1, embedding2);
      // If similarity is above the threshold, log the similar movie
      retinere_AfisareRezultat(cosineSimilarity,movies[i])
    }
}


const calculCosineMiniLM = async function(embedding1, movies){
  for (let i = 0; i < movies.length; i++) {
      const raw2 = await extractor(movies[i].overview, { pooling: 'mean', normalize: true });
      const embedding2 = raw2.data;

      // Compute cosine similarity between the original movie and the current movie in the array
      const cosineSimilarity = dotProduct(embedding1, embedding2);
      // If similarity is above the threshold, log the similar movie
      retinere_AfisareRezultat(cosineSimilarity,movies[i])
    }
}


const comparaDescrieri = async function(movie, movies, choice) {
  try{
    //cred ca e mai bine sa scoatem daca apare filmul original la final, decat acum la inceput unde trebuie sa trecem prin tot vectorul movies
    // if (!movie || !movies) {
    //   console.error("One or both sentences are empty.");
    //   return 0;
    // }
    //1. Initialize the feature extraction pipeline with the model
    filme_similare = [];
    if(choice.name == 'minilm') extractor = await extractorPromiseMiniLM;
    if(choice.name == 'mpnet') extractor = await extractorPromiseMpnet;


    //2. Extract embeddings for the movie overview
    const raw1 = await extractor(movie, { pooling: 'mean', normalize: true });
    const embedding1 = raw1.data;

    //3. Extract embeddings for the movies and compare with movie overview
    if(choice.name == 'minilm') await calculCosineMiniLM(embedding1,movies);
    if(choice.name == 'mpnet') await calculCosineMpnet(embedding1,movies);

    return filme_similare;


  }catch(err){
    console.log(err)
  }
}

const ComparaDescrieriMpnet_Minilm = async function(movie, movies){
  //ar trebui adaugat catchAsync si aici si AppError
  let data = [];
  selected_choice =  choice_minilm;
  movie_file = movie;

  data = await comparaDescrieri(
    movie.overview,
    movies,
    selected_choice
  ); // Calculate similarity
  //console.log("🐱‍👓🐱‍👓🐱‍🐉🐱‍🐉🐱‍🏍🐱‍🏍"+movies)
  selected_choice =  choice_mpnet;
  data = await comparaDescrieri(
      movie.overview,
      data,
      selected_choice
  )

  console.log("🐱‍👓🐱‍👓🐱‍🐉🐱‍🐉🐱‍🏍🐱‍🏍"+data)
  data = sortareAfisareFilme_si_slice(data)
  //pe langa sortare ne-ar trebuie adaugare in db a similar si excluderea filmului original de aici, nu din client.
  //Deja s-a facut asta? cum?
  return data
}

// Function to compute cosine similarity
function dotProduct(a, b) {
  const sum = a.reduce((acc, val, i) => acc + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(b.reduce((acc, val) => acc + val * val, 0));
  return sum / (normA * normB);
}

export default ComparaDescrieriMpnet_Minilm;