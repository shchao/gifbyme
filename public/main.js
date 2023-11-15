// Function to add uploaded image on the page
function addImageInRow(item) {
    const imageRow = document.getElementById('imageRow');
    const img = document.createElement('img');
    const filename = item.filename;
    img.src = `uploads/${existingUUID}/${filename}`;
    img.draggable = true;
    img.setAttribute('data-filename', filename);
    img.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', e.target.getAttribute('data-filename'));
    });
    imageRow.appendChild(img);
}

// Function to update the uploaded images on the page
function refreshImagesInRow() {
    fetch(`/images/${existingUUID}/records`)
      .then(response => response.json())
      .then(data => {
        const imageRow = document.getElementById('imageRow');
        imageRow.innerHTML = ''; // Clear existing images
        data.forEach(item => {
          addImageInRow(item);
        });
      });
}

// Function to handle the drop event
function handleImageReorderDragDrop(event) {
  event.preventDefault();
  const data = event.dataTransfer.getData('text/plain');
  const sourceImg = document.querySelector(`[data-filename="${data}"]`);
  if (sourceImg) {
    const imageRow = document.getElementById('imageRow');
    if (sourceImg.x < event.target.x) {
      imageRow.insertBefore(sourceImg, event.target.nextSibling);  
    } else {
      imageRow.insertBefore(sourceImg, event.target);  
    }
  }
}

function handleInputImagesDragDrop(e) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    const formData = new FormData();
    for (let file of files) {
      formData.append('files', file);
    }
    formData.append('clientId', existingUUID);
}

// aux
function saveBase64Image(base64Image, filename) {
  const a = document.createElement("a");
  a.href = base64Image;
  a.download = filename;
  // Simulate a click event to trigger the download
  a.click();
}

function saveAsAGifFile(ag, filename) {
  ag.getBase64GIF(function (image) {
      // Create an anchor element and set its href and download attributes
      saveBase64Image(image, filename)
  });
}

function saveImgElementAsGifFile(eleId, filename) {
      // Get a reference to the image element
      var image = document.getElementById(eleId);

      var base64Data = image.src.split(',')[1];

      // Decode the base64 string
      var binaryData = atob(base64Data);

      // Convert the binary data into a Blob
      var blob = new Blob([new Uint8Array(Array.from(binaryData).map(char => char.charCodeAt(0)))], { type: 'image/gif' });

      // Create a Blob URL for the Blob
      var blobUrl = URL.createObjectURL(blob);

      // Create a download link
      var link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;

      // Trigger a click on the link to start the download
      link.click();

      // Clean up by revoking the Blob URL
      URL.revokeObjectURL(blobUrl);
}

// Function to gather images in imageInRow and 
// 1. stretch images to specified size canvas
// 2. do the download
function downloadStretchImagesAsGif() {      
  // Get all the img elements inside the div
  const imageRow = document.getElementById('imageRow');
  var images = imageRow.getElementsByTagName("img");
  var arrayimages = Array.from(images).map(ele => ele.src);
  // Iterate through the images and print their src attributes      
  const imagePromises = arrayimages.map((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {resolve(img);}
      img.onerror = reject;
      img.src = src;
    })
  });
  // repeat 0 = Repeat forever
  var ag = new Animated_GIF.default({
    repeat: gifConfig.repeat, 
    disposal: gifConfig.disposal});
  ag.setSize(gifConfig.height, gifConfig.width);
  ag.setDelay(gifConfig.delay);

  Promise.all(imagePromises)
  .then((loadedimages) => {
      // All images have been loaded successfully
      for (let i=0;i<loadedimages.length;i++) {
        ag.addFrame(loadedimages[i]);
      }
      // You can now use the loaded images as needed
      // For example, you can append them to the DOM or create a GIF.
      saveAsAGifFile(ag, 'stretch.gif');
  })
  .catch((error) => {
      // Handle any errors that occur while loading images
      console.error('Error loading images:', error);
  });
}

// Load image and drawing to specified canvas to keep aspect ratio
function loadImagesKeepAspectRatio(src) {
    return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
          // Create a canvas with common dimensions
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate scaling factors to maintain aspect ratio
          const widthRatio = gifConfig.width / img.width;
          const heightRatio = gifConfig.height / img.height;
          const ratio = Math.min(widthRatio, heightRatio);

          // Calculate the scaled dimensions
          const scaledWidth = img.width * ratio;
          const scaledHeight = img.height * ratio;

          // Calculate the position to center the image
          const x = (gifConfig.width - scaledWidth) / 2;
          const y = (gifConfig.height - scaledHeight) / 2;

          canvas.width = gifConfig.width;
          canvas.height = gifConfig.height;

          // Draw the image with white background
          ctx.fillStyle = "white";          
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Draw the image in the center of the canvas
          ctx.drawImage(img, x, y, scaledWidth, scaledHeight);            
          // Generate a data URL for the canvas content
          const dataURL = canvas.toDataURL('image/png');
          resolve(ctx.getImageData(0, 0, gifConfig.width, gifConfig.height));
        };
        img.onerror = reject;
        img.src = src;
    });
}

// aux
function renderGifInContainer(ag) {
  return new Promise((resolve, reject)=>{ag.getBase64GIF((base64Gif) => {
      const gifContainer = document.getElementById('gifContainer');
      const gifImage = new Image();
      gifImage.src = base64Gif;
      gifImage.id = 'produced_gif';
      gifContainer.innerHTML = '';
      gifContainer.appendChild(gifImage);
      resolve(base64Gif);
  })});
}

// render gif keeping aspect ratio and download the gif if options has value
function renderGifKeepsAspectRatio(options) {
  openProcessModal();
  // Get all the img elements inside the div
  const imageRow = document.getElementById('imageRow');
  var imagesElements = imageRow.getElementsByTagName("img");
  var arrayimages = Array.from(imagesElements).map(ele => ele.src);
  // Iterate through the images and print their src attributes      
  const imagePromises = arrayimages.map(loadImagesKeepAspectRatio);

  var ag = new Animated_GIF.default({repeat: gifConfig.repeat, disposal: gifConfig.disposal});
  ag.setSize(gifConfig.width, gifConfig.height);
  ag.setDelay(gifConfig.delay);
  var filesizeInKB = 0;
  Promise.all(imagePromises)
    .then((contextImageDataCollection) => {
        // htmlImageElement
        contextImageDataCollection.forEach((imageData) => {
            ag.addFrameImageData(imageData);
        });
    })
    .then(() => {
      // and return a promise which 
      return renderGifInContainer(ag);
    }).then((base64Image) => {
      const base64ImageData = base64Image.split(',')[1]; // get only parts after 'data:image/gif;base64,'
      filesizeInKB = (atob(base64ImageData).length/1024).toFixed(2);
      // if there is an option, download it
      if(options !== undefined && options.filename !== undefined) saveBase64Image(base64Image, options.filename);      
    })
    .then(()=>{
        // File size: 480.04KiB, width: 512px, height: 675px, frames: 4, type: gif
        const text =document.getElementById("outputinfo");
        while (text.firstChild) {
          text.removeChild(text.firstChild);
        }
        const line = document.createElement("p");
        line.textContent = `File Size: ${filesizeInKB} kb, Width: ${gifConfig.width}, Height: ${gifConfig.height}, frames: ${arrayimages.length}, type: gif`;
        text.insertBefore(line, text.firstChild);
        document.getElementById('downloadAsGif').style.display = 'block';
        closeProcessModal();
      })
    .catch((error) => {
        console.error('Error loading images:', error);
        closeProcessModal();
    });
}

// handle the image crop
function getImageDimension(url) {
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = () => {
      resolve({url, width:img.width, height:img.height}) 
    }
    img.onerror = () => { reject('failed to load image : ${url}') }
    img.src = url;
  });
}
async function findSmallestDimension() {
  const imageRow = document.getElementById('imageRow');
  var imagesElements = imageRow.getElementsByTagName("img");
  const dimensions = await Promise.all(Array.from(imagesElements).map(ele => getImageDimension(ele.src)));
  const smallest = dimensions.reduce((smallest, current) => {
    // return current.width * current.height < smallest.width * smallest.height ? current : smallest;
    return {width:Math.min(smallest.width, current.width), height:Math.min(smallest.height, current.height)};
  });
  return smallest;
}
async function findImagesSmallest() {
  let dim = await findSmallestDimension();
  return dim;
}

function renderGifWithSmallestCanvas(options) {
  openProcessModal();
  findImagesSmallest().then((dimension)=>{
    let oldGifConfig = {...gifConfig};
    gifConfig.width = dimension.width;
    gifConfig.height = dimension.height;

    // Get all the img elements inside the div
    const imageRow = document.getElementById('imageRow');
    var imagesElements = imageRow.getElementsByTagName("img");
    var arrayimages = Array.from(imagesElements).map(ele => ele.src);
    // Iterate through the images and print their src attributes      
    const imagePromises = arrayimages.map((url)=>{
      // return cropFromCenter(url, dimension);
      return cropAndAspectRatioFromCenter(url, dimension);
    });
    var ag = new Animated_GIF.default({repeat: gifConfig.repeat, disposal: gifConfig.disposal});
    ag.setSize(gifConfig.width, gifConfig.height);
    ag.setDelay(gifConfig.delay);
    var filesizeInKB = 0;
    Promise.all(imagePromises)
      .then((contextImageDataCollection) => {
          contextImageDataCollection.forEach((imageData) => {
              ag.addFrameImageData(imageData);
          });
      })
      .then(() => {
        // Render the GIF to container, and return promise
        return renderGifInContainer(ag);
      }).then((base64Image) => {
        const base64ImageData = base64Image.split(',')[1]; // get only parts after 'data:image/gif;base64,'
        filesizeInKB = (atob(base64ImageData).length/1024).toFixed(2);
        // if there is an option, download it
        if(options !== undefined && options.filename !== undefined) saveBase64Image(base64Image, options.filename);
      })
      .then(()=>{
        // File size: 480.04KiB, width: 512px, height: 675px, frames: 4, type: gif
        const text =document.getElementById("outputinfo");
        while (text.firstChild) {
          text.removeChild(text.firstChild);
        }
        const line = document.createElement("p");
        line.textContent = `File Size: ${filesizeInKB} kb, Width: ${dimension.width}, Height: ${dimension.height}, frames: ${arrayimages.length}, type: gif`;
        text.insertBefore(line, text.firstChild);
        document.getElementById('downloadAsGif').style.display = 'block';
        closeProcessModal();
      })
      .catch((error) => {
          console.error('Error loading images:', error);
          closeProcessModal();
      });
    gifConfig.width = oldGifConfig.width;
    gifConfig.height = oldGifConfig.height;
  });  
}

function cropAndAspectRatioFromCenter(url, targetDimension) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = targetDimension.width;
      canvas.height = targetDimension.height;
      const aspectRatio = canvas.width / canvas.height;
      const imageAspectRatio = image.width / image.height;
      let newWidth, newHeight;
      if (image.width * canvas.height >= image.height * canvas.width) {
        newWidth = image.height * aspectRatio;
        newHeight = image.height;
      } else {
        newWidth = image.width;
        newHeight = image.width / aspectRatio;
      }

      // Calculate the crop values to keep the center part of the image
      const cropX = (image.width - newWidth) / 2;
      const cropY = (image.height - newHeight) / 2;

      ctx.drawImage(image, cropX, cropY, newWidth, newHeight, 0, 0, targetDimension.width, targetDimension.height);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
    image.onerror = reject;
    image.src = url;
  })  
}

function cropFromCenter(url, targetDimension) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = targetDimension.width;
      canvas.height = targetDimension.height;

      const offsetX = (image.width - targetDimension.width) / 2;
      const offsetY = (image.height - targetDimension.height) / 2;

      ctx.drawImage(image, offsetX, offsetY, targetDimension.width, targetDimension.height, 0, 0, targetDimension.width, targetDimension.height);
      // resolve(canvas.toDataURL());
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }
    image.onerror = reject;
    image.src = url;
  })  
}

// configuration
// repeat 0 = Repeat forever
let gifConfig = {
  width: 500,
  height: 500,
  delay: 500,
  disposal : 2,
  repeat : 0
}
document.getElementById('makeagif').addEventListener('click', () => {
  var selectedOption = document.querySelector('input[name="option"]:checked').value;
  let delay = document.getElementById('time').value;
  if (delay != undefined) {
    gifConfig.delay = delay;
  }
  if(selectedOption === 'fit') {
      document.getElementById('previewGif').click();
  } else {
      document.getElementById('previewCropGif').click();
  }
});

document.getElementById('previewGif').addEventListener('click', () => {
  let w = document.getElementById('width').value, h = document.getElementById('height').value;
  if (w != undefined && h != undefined) {
    gifConfig.width = w; gifConfig.height = h;
  }
  renderGifKeepsAspectRatio();
});

document.getElementById('downloadAsGif').addEventListener('click', () => {  
  // renderGifKeepsAspectRatio({filename : 'fitinside_xx.gif'});
  const id = `produced_gif`;
  if (document.getElementById(id)) saveImgElementAsGifFile(id, `gifbyme_${new Date(Date.now()).getTime()}.gif`);
});

document.getElementById('previewCropGif').addEventListener('click', () => {
  renderGifWithSmallestCanvas();
  // renderGifWithSmallestCanvas({filename : 'fitinside_xx.gif'});
});

const imageRow = document.getElementById('imageRow');
imageRow.addEventListener('drop', handleImageReorderDragDrop);
imageRow.addEventListener('dragover', (event) => { event.preventDefault(); });

// drop area
const dropArea = document.getElementById('drop-area');
dropArea.addEventListener("click", function(e) {
  document.getElementById("uploadFormInput").click();
});
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('highlight');
});
dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('highlight');
});
dropArea.addEventListener('drop', handleInputImagesDragDrop);

document.getElementById("uploadFormInput").addEventListener("change", function(event) {
    openProcessModal();
    const formData = new FormData();
    for (let file of this.files) {
      formData.append('files', file);
    }
    formData.append('clientId', existingUUID);
    
    const params = new URLSearchParams();
    let success = false;
    params.append('clientId', existingUUID);
    fetch(`/upload?${params.toString()}`, {
        method: 'POST',
        body: formData
    })
    .then((response) => {
      success = response.ok;
      return response.text();
    })
    .then((data) => {
      if (!success) {
        throw new Error(`${data}`);
      }
      refreshImagesInRow();
      closeProcessModal();
    })
    .catch((error) => {
        alert(`Uploading error : ${error.message}`);
          e.error(error);
        closeProcessModal();
    });
})

// aux

function openProcessModal() {
  var modal = document.getElementById('uploadModal');
  var overlay = document.getElementById('disableOverlay');

  modal.style.display = 'block';
  overlay.style.display = 'block';
}

function closeProcessModal() {
  var modal = document.getElementById('uploadModal');
  var overlay = document.getElementById('disableOverlay');

  modal.style.display = 'none';
  overlay.style.display = 'none';
}

// Submit the form via AJAX to handle uploads without page reload
document.getElementById("uploadForm").addEventListener("submit", function(event) {
  event.preventDefault(); // Prevent the default form submission
  const formData = new FormData(this);
  formData.append('clientId', existingUUID);
  // List key/value pairs
  for(let [name, value] of formData) {
    alert(`${name} = ${value}`); // key1 = value1, then key2 = value2
  }
  alert("endofpair");
    fetch("upload", {
    // fetch("gifbyme/us-central1/webapp/upload", {
      method: "POST",      
      body: formData,
    })
    .then(response => response.text())
    .then(data => {
      alert(data); // Display a message indicating upload success
      refreshImagesInRow(); // Refresh the displayed images
    })
    .catch(error => {
      console.error("Error:", error);
    });
});


// Check if the UUID cookie exists
let existingUUID = getCookie('uuid');
if (existingUUID) {
  // Use the existing UUID
} else {
  // Generate a new UUIDdelay
  const newUUID = uuid.v4();
  
  // Set the new UUID as a cookie
  // document.cookie = `uuid=${newUUID}; expires=Fri, 01 Nov 2023 23:59:59 GMT; path=/`;
  document.cookie = `uuid=${newUUID}; expires=Fri, 01 Nov 2024 23:59:59 GMT; path=/`;
  existingUUID = newUUID;
}

// Function to retrieve a specific cookie by name
function getCookie(name) {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=');
    if (cookieName.trim() === name) {
      return cookieValue;
    }
  }
  return null;
}

// Initialize the image display and drag-and-drop on page load
refreshImagesInRow();