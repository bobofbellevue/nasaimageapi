// documentation at: https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf
const nasaApiKey = 'XpeZir4ZX0cDXR1saGnB02b0GsE6lz0DrGjRc3UH';

// 0=2012, 1=2013...11=2023
let pageCount = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

let photoGalleryCollection = [];
let photoFavoritesCollection = [];

let skipGallery = 0;

function getPageCount(year) {
  return pageCount[Number(year) - 2012];
}

function resetPageCount(year) {
  pageCount[Number(year) - 2012] = 1;
}

function bumpPageCount(year) {
  pageCount[Number(year) - 2012] = pageCount[Number(year) - 2012] + 1;
}

async function fetchNasaData(year) {
  photoGalleryCollection = [];
  let gotData = false;
  let imageArray = [];
  do {
    const response = await fetch(`https://images-api.nasa.gov/search?media_type=image&year_start=${year}&year_end=${year}&page=${getPageCount(year)}&page_size=100`);
    const nasaData = await response.json();
    if (nasaData.collection.items.length < 100) {
      resetPageCount(year);
    }
    else {
      imageArray = nasaData.collection.items;
      gotData = true;
    }
  } while (! gotData);
  for (let i=0; i < imageArray.length; i++) {
    const image = imageArray[i];
    const dataArray = image.data;
    const data = dataArray[0];
    const linksArray = image.links;
    const link = linksArray[0];
    const href = link['href'].replace('thumb', 'large');
    if (! isValidUrl(href)) {
      continue;
    }
    const photo = new Object();
    photo.center = data['center'];
    photo.date_created = data['date_created'].substring(0, 10);
    photo.description = data['description'];
    photo.media_type = data['media_type'];
    photo.nasa_id = data['nasa_id'];
    photo.photographer = data['photographer'];
    photo.title = data['title'];
    photo.href = href;
    photoGalleryCollection.push(photo);
  }
}

// note: validates URL format, but does not test if file is available, some older NASA files return 403
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (err) {
    return false;
  }
}

function pushToCollection(collection, photo) {
  switch (collection.id) {
    case 'gallery':
      {
	const selectYear = document.getElementById('year');
	const yearSelected = selectYear.value;
	const yearPhoto = photo['date_created'].substring(0, 4);
	if (Number(yearSelected) == Number(yearPhoto)) {
	  photoGalleryCollection.push(photo);
	}
      }
      break;
    case 'favorites':
      photoFavoritesCollection.push(photo);
      break;
    default:
      return;
  }
}

function insertPhotoBefore(collection, index, photoCompare, photo, image) {
  let property = '';
  let less = false;
  switch (collection.dataset.sort) {
    case 'oldest':
      property = 'date_created';
      less = true;
      break;
    case 'newest':
      property = 'date_created';
      less = false;
      break;
    case 'az':
      property = 'title';
      less = true;
      break;
    case 'za':
      property = 'title';
      less = false;
      break;
    default:
      break;
  }
  const propertyCompare = photoCompare[property];
  const propertyAdd = photo[property];
  if (less ? propertyAdd <= propertyCompare : propertyAdd >= propertyCompare ) {
    pushToCollection(collection, photo);
    return collection.insertBefore(image, collection.children[index]);
  }
  return null;
}

function addImageToCollection(collection, image, photo) {
  let pCenters = null;
  for (let i=0; i < collection.children.length; i++) {
    const nasa_id = collection.children[i].id;
    if (nasa_id == 'skip-centers') {
      pCenters = collection.children[i];
      continue;
    }
    if (nasa_id.substring(0, 4) == 'skip') {
      continue;
    }
    const collectionCompare = (collection.id == 'gallery') ? photoGalleryCollection : photoFavoritesCollection;
    const photoCompare = collectionCompare.find(photo => nasa_id == photo.nasa_id);
    const newNode = insertPhotoBefore(collection, i, photoCompare, photo, image);
    if (newNode) {
      return newNode;
    }
  }
  pushToCollection(collection, photo);
  if (pCenters) {
    return collection.insertBefore(image, pCenters);
  }
  return collection.appendChild(image);
}

function addPhotoElement(photo, section) {
  const divImage = document.createElement("div");
  divImage.className = 'nasa-image';
  divImage.id = photo['nasa_id'];
  divImage.dataset.title = photo['title'];
  divImage.dataset.dateCreated = photo['date_created'];
  divImage.dataset.center = photo['center'];
  divImage.dataset.photographer = photo['photographer'];
  addImageToCollection(section, divImage, photo);

  const aNasa = document.createElement("a");
  aNasa.href = photo['href'];
  aNasa.target = 'blank';
  divImage.appendChild(aNasa);

  const imgNasa = document.createElement("img");
  imgNasa.src = photo['href'];
  imgNasa.alt = photo['title'];
  aNasa.appendChild(imgNasa);

  const br1 = document.createElement("br");
  divImage.appendChild(br1);

  const h4Title = document.createElement("h4");
  divImage.appendChild(h4Title);

  const iHeart = document.createElement("i");
  iHeart.className = (section.id == 'gallery') ? "fa-regular fa-heart" : "fa-solid fa-heart";
  h4Title.appendChild(iHeart);
  iHeart.addEventListener("click", function() {
    divImage.remove();
    switch (iHeart.className) {
      case 'fa-solid fa-heart':
	{
	  iHeart.className = "fa-regular fa-heart";
	  const selectYear = document.getElementById('year');
	  const yearSelected = selectYear.value;
	  const yearPhoto = photo['date_created'].substring(0, 4);
	  if (Number(yearSelected) == Number(yearPhoto)) {
	    const sectionGallery = document.getElementById('gallery');
	    addImageToCollection(sectionGallery, divImage, photo);
	  }
	}
	break;
      case 'fa-regular fa-heart':
	{
	  iHeart.className = "fa-solid fa-heart";
	  const sectionFavorites = document.getElementById('favorites');
	  addImageToCollection(sectionFavorites, divImage, photo);
	}
	break;
      default:
	break;
    }
  });

  const pH4 = document.createElement("p");
  pH4.innerHTML = '&nbsp;' + photo['title'];
  h4Title.appendChild(pH4);

  const br2 = document.createElement("br");
  h4Title.appendChild(br2);

  const pDateCreated = document.createElement("p");
  pDateCreated.innerHTML = photo['date_created'];
  h4Title.appendChild(pDateCreated);
}

function calcProperty(id, property, termPlural) {
  const pProperty = document.getElementById(id);
  const sectionGallery = document.getElementById('gallery');
  const setProperty = new Set();
  for (let i=0; i < sectionGallery.children.length; i++) {
    const element = sectionGallery.children[i];
    if (element.id.substring(0, 4) == 'skip') {
      continue;
    }
    const name = eval('element.dataset.' + property);
    setProperty.add(name);
  }
  const iteratorProperty = setProperty.values();
  let textProperty = '';
  for (const nameProperty of iteratorProperty) {
    if (textProperty != '') {
      textProperty += ', ';
    }
    textProperty += nameProperty;
  }
  pProperty.innerHTML = setProperty.size + ' ' + ((setProperty.size == 1) ? property : termPlural) + ' (' + textProperty + ')';
}

function calcCenters() {
  calcProperty('skip-centers', 'center', 'centers');
}

function calcPhotographers() {
  calcProperty('skip-photographers', 'photographer', 'photographers');
}

function buildPhotoElements() {
  const sectionGallery = document.getElementById('gallery');
  skipGallery = Math.floor(Math.random() * 4);
  for (let i=0, count = 0; i < photoGalleryCollection.length; i++, skipGallery++) {
    // skipping 3 out of 4 photos to bring in more variety, lots of duplicates among adjacent photos
    if (skipGallery < 3) {
      continue;
    }
    skipGallery = 0;
    if (++count > 30) {
      break;
    }
    addPhotoElement(photoGalleryCollection[i], sectionGallery);
  }
  calcCenters();
  calcPhotographers();
}

function clearElements(section) {
  let skip = 0;
  while (section.children.length > skip) {
    // header, controls, and statistics appear in flex box along with photos, we want to delete photos only
    if (section.children[skip].id.substring(0, 4) == 'skip') {
      skip++;
      continue;
    }
    section.children[skip].remove();
  }
}

function reloadGalleryElements(year) {
  const sectionGallery = document.getElementById('gallery');
  clearElements(sectionGallery)
  fetchNasaData(year).then(res => {
    buildPhotoElements();
  }).catch(err => console.log(err));
}

function isFavorite(nasa_id) {
  for (let i=0; i < photoFavoritesCollection.length; i++) {
    if (nasa_id == photoFavoritesCollection[i].nasa_id) {
      return true;
    }
  }
  return false;
}

function reloadSectionElements(sectionId, sort) {
  const section = document.getElementById(sectionId);
  section.dataset.sort = sort;
  const currentLength = section.children.length;
  clearElements(section);
  const isGallery = (section.id == 'gallery');
  const photoCollection = isGallery ? photoGalleryCollection : photoFavoritesCollection;
  const originalLength = isGallery ? 4 : 2;
  let foundFavorite = false;
  for (let i=0, count = 0; i < photoCollection.length; i++, skipGallery++) {
    if (isGallery && isFavorite(photoCollection[i].nasa_id)) {
      foundFavorite = true;
    }
    if (isGallery && skipGallery < 3) {
      continue;
    }
    skipGallery = 0;
    if (foundFavorite) {
      foundFavorite = false;
      continue;
    }
    if (++count > 30 || count > currentLength - originalLength) {
      break;
    }
    addPhotoElement(photoCollection[i], section);
  }
}

fetchNasaData('2023').then(res => {
  const sectionGallery = document.getElementById('gallery');
  const sectionFavorites = document.getElementById('favorites');
  buildPhotoElements();
  const selectYear = document.getElementById('year');
  selectYear.addEventListener("change", (event) => {
    bumpPageCount(selectYear.value);
    reloadGalleryElements(selectYear.value);
  });
  const collectionButtons = document.getElementsByClassName('sort-radios');
  const arrayButtons = Array.from(collectionButtons);
  arrayButtons.forEach(nodeButton => nodeButton.addEventListener('click', function() { reloadSectionElements(nodeButton.dataset.gallery, nodeButton.dataset.sort); }));
}).catch(err => console.log(err));
