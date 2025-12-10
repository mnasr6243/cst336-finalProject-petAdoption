// public/js/app.js

document.addEventListener("DOMContentLoaded", () => {
  initRandomDog();
  debugFetchAnimals();
});

/* ------------------------------
   External API: Random Dog Image
--------------------------------*/
function initRandomDog() {
  const img = document.getElementById("randomPetImg");
  const btn = document.getElementById("refreshPetBtn");
  if (!img || !btn) return;

  async function loadDog() {
    try {
      const resDog = await fetch("https://dog.ceo/api/breeds/image/random");
      const dataDog = await resDog.json();
      const resCat = await fetch("https://api.thecatapi.com/v1/images/search?limit=10");
      const dataCat = await resCat.json();
      let rand = Math.random() < 0.5;
      if(rand) {
        img.src = dataDog.message;
      } else {
        img.src = dataCat[0].url;
      }
    } catch (err) {
      console.error("Dog API Error:", err);
    }
  }

  btn.addEventListener("click", loadDog);
  loadDog();
}

/* ------------------------------
   Local API: /api/animals
--------------------------------*/
async function debugFetchAnimals() {
  try {
    const res = await fetch("/api/animals");
    const animals = await res.json();
    console.log("Available animals:", animals);
  } catch (err) {
    console.error("Local API error:", err);
  }
}