import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db , storage} from '../../config/firebase-config';
import { doc, onSnapshot, updateDoc, collection , query , where, getDoc} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { FaPen, FaImage, FaFont, FaArrowLeft, FaArrowRight, FaTrash, FaCog, FaEraser, FaEdit, FaEllipsisV } from 'react-icons/fa';
import CanvasElement from '../canvas/CanvasElement';
import { useNavigate } from 'react-router-dom';
import ScrapbookSettings from './ScrapbookSettings'; 
import CommentSection from '../comments/CommentSection';
import CommentButton from '../comments/CommentButton';
import { GUEST_UID } from '../../config/constants';
import { serverTimestamp } from 'firebase/firestore';


const CANVAS_SIZE = 4096;

const ScrapbookEditor = ({
  scrapbookId,
  elements : initialElements,
  updateElements : updateElementsProp,
  isEditable,
  userId,
  collaborators : initialCollaborators,
}) => {
    const { user } = useAuth();
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);
    const navigate = useNavigate();
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [unreadComments, setUnreadComments] = useState(0);
    const [context, setContext] = useState(null);
    const [tool, setTool] = useState('select');
    const [isDrawing, setIsDrawing] = useState(false);
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
  
    const [isDragging, setIsDragging] = useState(false);
    // const [currentPath, setCurrentPath] = useState([]);
    const [selectedElement, setSelectedElement] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [eraserSize, setEraserSize] = useState(20);
    const [isPanning, setIsPanning] = useState(false);
    const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
    const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
    const isPointInEraser = (x1, y1, x2, y2) => {
      const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      return distance <= eraserSize/2
    }
    const handleBackToDashboard = async () => {
      try {
        console.log('Starting thumbnail generation...');
        await generateThumbnail(scrapbookId);
        console.log('Thumbnail generation completed');
        
        // Only navigate after thumbnail is generated
        if (!user || user.uid === GUEST_UID) {
          navigate('/guest');
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error during thumbnail generation:', error);
        // Navigate anyway if thumbnail generation fails
        if (!user || user.uid === GUEST_UID) {
          navigate('/guest');
        } else {
          navigate('/dashboard');
        }
      }
    };
    const [elements, setElements] = useState(initialElements || []);
    const [collaborators, setCollaborators] = useState(initialCollaborators || []);
    const [currentPath, setCurrentPath] = useState(null); // Temporary state for the path being drawn
    // console.log('ScrapbookEditor - Current User:', user);
    // console.log('Scrapbook ID:', scrapbookId);

    const updateElements = (newElements) => {
      setUndoStack((prev) => [...prev,elements]);
      setRedoStack([]);
      updateElementsProp(newElements);
    };
    const handleUndo = () => {
      if (undoStack.length === 0) return;
      const lastState = undoStack.pop(); 
      setRedoStack((prev) => [...prev, elements]); 
      updateElementsProp(lastState); 
    };
    const handleRedo = () => {
      if (redoStack.length === 0) return;
      const nextState = redoStack.pop(); 
      setUndoStack((prev) => [...prev, elements]); 
      updateElementsProp(nextState); 
    };
    const clearCanvas = () => {
      setUndoStack((prev) => [...prev, elements]); 
      updateElements([]); 
    };

    useEffect(() => {
      if (!scrapbookId || !user) return;
    
      const commentsRef = collection(db, 'scrapbooks', scrapbookId, 'comments');
      const q = query(
        commentsRef,
        where('timestamp', '>', new Date(localStorage.getItem(`lastRead_${scrapbookId}`) || 0)),
        where('userId', '!=', user.uid)
      );
    
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadComments(snapshot.docs.length);
      });
    
      return () => unsubscribe();
    }, [scrapbookId, user]);
    
    // Add this function to handle opening comments
    const handleOpenComments = () => {
      setIsCommentsOpen(true);
      setUnreadComments(0);
      localStorage.setItem(`lastRead_${scrapbookId}`, new Date().toISOString());
    };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    setContext(ctx);

    const unsubscribe = onSnapshot(doc(db, 'scrapbooks', scrapbookId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setElements(data.elements || []);
        setCollaborators(data.collaborators || []);
      }
    });

    return () => unsubscribe();
  }, [scrapbookId]);

  // useEffect(() => {
  //   if (!context) return;
  
  //   // Clear and redraw the canvas
  //   context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  //   // elements.forEach((element) => drawElement(element));
  //   await Promise.all(
  //     elements.map((element) => drawElementOnThumbnail(element, thumbnailContext, scale))
  //   );
  
  //   if (currentPath) {
  //     drawPath(currentPath); // Render the path being drawn in real-time
  //   }
  // }, [elements, currentPath, context, selectedElement]); // Add selectedElement here

  // useEffect(() => {
  //   if (!context || !canvasRef.current || !elements) return;
  
  //   // Clear and redraw the main canvas
  //   context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  
  //   elements.forEach((element) => {
  //     drawElement(element, context); // Assuming `drawElement` handles rendering on the main canvas
  //   });
  // }, [context, elements]); // Add dependencies to re-render when elements change
  
  useEffect(() => {
  if (!context || !canvasRef.current || !elements) return;

  // Clear the canvas
  context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

  // Draw all permanent elements
  elements.forEach((element) => {
    drawElement(element, context);
  });

  // Draw the current path if it exists
  if (currentPath) {
    context.beginPath();
    context.strokeStyle = currentPath.color;
    context.lineWidth = currentPath.width;
    currentPath.points.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.stroke();
  }
}, [context, elements, currentPath])

  const updateFirebase = async (updatedElements) => {
    try {
      // Reference the specific document in Firestore
      const scrapbookDoc = doc(db, "scrapbooks", scrapbookId);
  
      // Update the document with new data
      await updateDoc(scrapbookDoc, {
        elements: updatedElements, // Update the elements field with the new data
        lastModified: new Date().toISOString(), // Optional: track when it was last updated
        lastModifiedBy: user.uid, // Optional: track who updated it
      });
  
      // console.log("Firebase update successful");
    } catch (error) {
      console.error("Error updating Firebase:", error);
    }
  };  

  const drawElement = (element) => {
    switch (element.type) {
      case 'path':
        drawPath(element);
        break;
      case 'image':
        drawImage(element);
        break;
      case 'text':
        drawText(element);
        break;
    }
  
    // Highlight the selected element
    if (selectedElement && selectedElement.id === element.id) {
      context.save(); // Save the current context state
      context.strokeStyle = 'red'; // Highlight color
      context.lineWidth = 2;
  
      if (element.type === 'image') {
        context.strokeRect(element.x, element.y, element.width, element.height);
      } else if (element.type === 'path') {
        const xMin = Math.min(...element.points.map((p) => p.x)) - 5;
        const yMin = Math.min(...element.points.map((p) => p.y)) - 5;
        const xMax = Math.max(...element.points.map((p) => p.x)) + 5;
        const yMax = Math.max(...element.points.map((p) => p.y)) + 5;
  
        context.strokeRect(xMin, yMin, xMax - xMin, yMax - yMin);
      } else if (element.type === 'text') {
        const textWidth = context.measureText(element.text).width;
        context.strokeRect(element.x, element.y - element.fontSize, textWidth, element.fontSize + 5);
      }
  
      context.restore(); // Restore the original context state
    }
  };  

  const drawPath = (element) => {
    if (!context) return;
    context.beginPath();
    context.strokeStyle = selectedElement?.id === element.id ? '#ff0000' : element.color; 

    context.lineWidth = selectedElement?.id === element.id ? element.width + 2 : element.width;
    element.points.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.stroke();
  };

  const drawImage = (element) => {
    if (!context) return;
    const img = new Image();
    img.src = element.src;
    img.onload = () => {
      context.drawImage(img, element.x, element.y, element.width, element.height);
    };
  };

  const drawText = (element) => {
    if (!context) return;
    context.font = `${element.fontSize}px ${element.fontFamily}`;
    context.fillStyle = element.color;
    context.fillText(element.text, element.x, element.y);
  };

  const deleteSelectedElement = async () => {
    if (!selectedElement) return;
    const updatedElements = elements.filter(
      (element) => element.id !== selectedElement.id
    );
    updateElements(updatedElements);
    await updateFirebase(updatedElements);
    setSelectedElement(null);
  };

  const isPointInElement = (x, y, element) => {
    switch (element.type) {
      case 'path':
        // Check if the point is near any part of the path
        return element.points.some((point, index) => {
          if (index === 0) return false; // Skip the first point (no segment before it)
          const prevPoint = element.points[index - 1];
          return getDistanceToSegment({ x, y }, prevPoint, point) <= 5; // Adjust sensitivity
        });
      case 'image':
        return (
          x >= element.x &&
          x <= element.x + element.width &&
          y >= element.y &&
          y <= element.y + element.height
        );
      case 'text': {
        const textWidth = context.measureText(element.text).width;
        return (
          x >= element.x &&
          x <= element.x + textWidth &&
          y <= element.y &&
          y >= element.y - element.fontSize
        );
      }
      default:
        return false;
    }
  };    

  const handleMouseDown = (e) => {
    if (!isEditable) return;
  
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
  
    switch (tool) {
      case 'hand': {
        setIsPanning(true);
        setLastMousePosition({
          x: e.clientX,
          y: e.clientY
        });
        break;
      }

      case 'draw': {
        setIsDrawing(true);
        const newPath = {
          id: Date.now(),
          type: 'path',
          points: [{ x, y }],
          color: '#000000',
          width: 2,
        };
        setCurrentPath(newPath);
        break;
      }
  
      case 'erase': {
        setIsDrawing(true);
        const updatedElements = elements.map((el) => {
          if (el.type === 'path') {
            const remainingPoints = el.points.filter((point) => {
              const dx = point.x - x;
              const dy = point.y - y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              return distance >= 5; // Adjust sensitivity
            });
  
            if (remainingPoints.length > 1) {
              return { ...el, points: remainingPoints };
            }
            return null; // Remove if too few points remain
          }
          return el; // Keep non-path elements
        }).filter(Boolean);
  
        updateElements(updatedElements); // Update state with erased paths
        break;
      }
  
      case 'text': {
        const text = prompt('Enter text:');
        if (text) {
          const textElement = {
            id: Date.now(),
            type: 'text',
            x,
            y,
            text,
            fontSize: 16,
            fontFamily: 'Arial',
            color: '#000000',
          };
          updateElements([...elements, textElement]);
        }
        break;
      }
  
      case 'select': {
        const clickedElement = elements.find((el) => isPointInElement(x, y, el));
        if (clickedElement) {
          setSelectedElement({
            ...clickedElement,
            xStart: x, // Store initial click position
            yStart: y,
          });
          setIsDragging(true); // Start dragging
        } else {
          setSelectedElement(null); // Deselect if no element is clicked
        }
        break;
      }
  
      default:
        break;
    }
  };
  
  function getDistanceToSegment(point, segmentStart, segmentEnd) {
    const { x: px, y: py } = point;
    const { x: x1, y: y1 } = segmentStart;
    const { x: x2, y: y2 } = segmentEnd;
  
    const lineLengthSquared =
      (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  
    if (lineLengthSquared === 0) {
      // Start and end are the same point
      const dx = px - x1;
      const dy = py - y1;
      return Math.sqrt(dx * dx + dy * dy);
    }
  
    // Project the point onto the line segment
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSquared;
    t = Math.max(0, Math.min(1, t)); // Clamp t to [0, 1]
  
    // Find the closest point on the line segment
    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);
  
    // Return the distance from the point to the closest point
    const dx = px - closestX;
    const dy = py - closestY;
    return Math.sqrt(dx * dx + dy * dy);
  }  

  const handleMouseMove = (e) => {
    if (!isEditable) return;
  
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
  
    switch (tool) {
      case 'hand': {
        if (isPanning) {
          const deltaX = e.clientX - lastMousePosition.x;
          const deltaY = e.clientY - lastMousePosition.y;

          setPanPosition(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY
          }));

          setLastMousePosition({
            x: e.clientX,
            y: e.clientY
          });
          break;
        }
      }

      case 'draw': {
        if (isDrawing && currentPath) {
          const updatedPath = {
            ...currentPath,
            points: [...currentPath.points, { x, y }],
          };
          setCurrentPath(updatedPath);
        }
        break;
      }
  
      case 'erase': {
        if (isDrawing) {
          const updatedElements = elements.flatMap((el) => {
            if (el.type === 'path') {
              let newSegments = [];
              let currentSegment = [];
  
              for (let i = 0; i < el.points.length - 1; i++) {
                const start = el.points[i];
                const end = el.points[i + 1];
  
                const distanceToSegment = getDistanceToSegment(
                  { x, y },
                  start,
                  end
                );
  
                if (distanceToSegment >= 5) {
                  if (currentSegment.length === 0) {
                    currentSegment.push(start);
                  }
                  currentSegment.push(end);
                } else {
                  if (currentSegment.length > 1) {
                    newSegments.push({ ...el, points: currentSegment });
                  }
                  currentSegment = [];
                }
              }
  
              if (currentSegment.length > 1) {
                newSegments.push({ ...el, points: currentSegment });
              }
  
              return newSegments;
            }
            return el;
          });
  
          setElements(updatedElements);
        }
        break;
      }
  
      case 'select': {
        if (isDragging && selectedElement) {
          const dx = x - selectedElement.xStart; // Calculate movement in x
          const dy = y - selectedElement.yStart; // Calculate movement in y
  
          const updatedElements = elements.map((el) => {
            if (el.id === selectedElement.id) {
              if (el.type === 'path') {
                // Move all points in the path
                return {
                  ...el,
                  points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
                };
              } else if (el.type === 'image' || el.type === 'text') {
                // Move image or text
                return { ...el, x: el.x + dx, y: el.y + dy };
              }
            }
            return el;
          });
  
          setElements(updatedElements);
  
          // Update the position of `selectedElement` for real-time feedback
          setSelectedElement({
            ...selectedElement,
            xStart: x, // Update start to the current position
            yStart: y,
          });
        }
        break;
      }
  
      default:
        break;
    }
  };  

  const handleMouseUp = () => {
    if(!isEditable) return; 
    
    if (tool === 'select' && isDragging) {
      // updateElements(elements);
      updateFirebase(elements); // Save updated positions to Firebase
      /*
      Edit: I commented this out because we can't select an item and delete it if this persists
      //if it deselects after dragging, then not sure how to just select an item and keep it highlighted
      // setSelectedElement(null); // Deselect after movement 
      */
      setIsDragging(false);
      return;
    }   

    if (isPanning) {
      setIsPanning(false);
      return; // Exit early if was panning
    }

    if (isDrawing) {
      if (tool === 'erase') {
        updateFirebase(elements);
      } else if (currentPath) {
        const updatedElements = [...elements, currentPath];
        updateElements(updatedElements); 
        updateFirebase(updatedElements); 
        setCurrentPath(null); 
      }
      setIsDrawing(false);
    }

    if (!isEditable || !isDrawing) return;
    setIsDrawing(false);

    if (tool === 'erase') {
      updateFirebase(elements); 
    } 
  
    if (currentPath) {
      const updatedElements = [...elements, currentPath];
      updateElements(updatedElements); 
      updateFirebase(updatedElements); 
      setCurrentPath(null); 
    }
    setIsDrawing(false);
  };

  const generateThumbnail = async (scrapbookId) => {
    if (!scrapbookId) {
      console.error('scrapbookId is required for thumbnail generation');
      return;
    }
  
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
  
      const thumbnailCanvas = document.createElement('canvas');
      const thumbnailContext = thumbnailCanvas.getContext('2d');
      const THUMBNAIL_WIDTH = 300;
      const THUMBNAIL_HEIGHT = 200;
  
      thumbnailCanvas.width = THUMBNAIL_WIDTH;
      thumbnailCanvas.height = THUMBNAIL_HEIGHT;
  
      // Set white background
      thumbnailContext.fillStyle = 'white';
      thumbnailContext.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  
      // Find the bounds of all elements to calculate proper scaling
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      elements.forEach(element => {
        switch (element.type) {
          case 'path':
            element.points.forEach(point => {
              minX = Math.min(minX, point.x);
              minY = Math.min(minY, point.y);
              maxX = Math.max(maxX, point.x);
              maxY = Math.max(maxY, point.y);
            });
            break;
          case 'image':
          case 'text':
            minX = Math.min(minX, element.x);
            minY = Math.min(minY, element.y);
            maxX = Math.max(maxX, element.x + (element.width || 0));
            maxY = Math.max(maxY, element.y + (element.height || 0));
            break;
        }
      });
  
      // Add padding
      const PADDING = 20;
      minX = Math.max(0, minX - PADDING);
      minY = Math.max(0, minY - PADDING);
      maxX = Math.min(CANVAS_SIZE, maxX + PADDING);
      maxY = Math.min(CANVAS_SIZE, maxY + PADDING);
  
      // Calculate content dimensions
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
  
      // Calculate scale to fit content while maintaining aspect ratio
      let scale;
      if (contentWidth === 0 || contentHeight === 0) {
        // If no content, use default scale
        scale = 0.5;
      } else {
        scale = Math.min(
          (THUMBNAIL_WIDTH - 40) / contentWidth,
          (THUMBNAIL_HEIGHT - 40) / contentHeight
        );
      }
  
      // Ensure minimum scale
      scale = Math.max(scale, 0.1);
  
      // Calculate centering offsets
      const offsetX = (THUMBNAIL_WIDTH - contentWidth * scale) / 2 - minX * scale;
      const offsetY = (THUMBNAIL_HEIGHT - contentHeight * scale) / 2 - minY * scale;
  
      thumbnailContext.save();
      thumbnailContext.translate(offsetX, offsetY);
      thumbnailContext.scale(scale, scale);
  
      // Modify the drawing context for thicker lines and larger text
      const enhanceContext = (context) => {
        context.lineWidth *= 2; // Make lines thicker
        if (context.font) {
          const fontSize = parseInt(context.font);
          context.font = context.font.replace(
            /\d+px/,
            `${fontSize * 1.5}px`
          );
        }
      };
  
      // Draw each element with enhanced visibility
      for (const element of elements) {
        try {
          await drawElementOnThumbnail(element, thumbnailContext, enhanceContext);
        } catch (error) {
          console.error('Error drawing element:', error);
        }
      }
  
      thumbnailContext.restore();
  
      // Get the blob with maximum quality
      const thumbnailBlob = await new Promise((resolve) => {
        thumbnailCanvas.toBlob(resolve, 'image/png', 1.0);
      });
  
      if (!thumbnailBlob) {
        throw new Error('Failed to generate thumbnail blob');
      }
  
      const thumbnailFileName = `thumbnail_${Date.now()}.png`;
      const storageRef = ref(storage, `scrapbooks/${scrapbookId}/${thumbnailFileName}`);
  
      await uploadBytes(storageRef, thumbnailBlob);
      const thumbnailURL = await getDownloadURL(storageRef);
  
      await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
        thumbnail: thumbnailURL,
        lastUpdated: serverTimestamp(),
        lastThumbnailUpdate: new Date().toISOString()
      });
  
      console.log('Thumbnail successfully generated and saved:', thumbnailURL);
      return thumbnailURL;
  
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      throw error;
    }
  };
  // const handleImageUpload = async (e) => {
  //   const file = e.target.files[0];
  //   if (!file) return;

  //   const storageRef = ref(storage, `scrapbooks/${scrapbookId}/${Date.now()}_${file.name}`);
  //   await uploadBytes(storageRef, file);
  //   const url = await getDownloadURL(storageRef);
  //   // console.log(url)

  //   updateElements([
  //       ...elements,
  //       {
  //         id: Date.now(),
  //         type: 'image',
  //         src: url,
  //         x: 100,
  //         y: 100,
  //         width: 200,
  //         height: 200,
  //       },
  //     ]);
  // }; 

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    // Check file type and size
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
  
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      alert('Please upload an image smaller than 5MB');
      return;
    }
  
    try {
      // Create a unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(storage, `scrapbooks/${scrapbookId}/images/${fileName}`);
  
      // Create a loading placeholder
      const placeholderElement = {
        id: Date.now(),
        type: 'image',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        src: '', // You can use a loading image
        isLoading: true
      };
  
      // Add placeholder to elements
      updateElements([...elements, placeholderElement]);
  
      // Upload the file
      const uploadTask = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(uploadTask.ref);
      console.log(url);

  
      // Process the image to get its natural dimensions
      const img = new Image();
      img.src = url;
  
      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Calculate dimensions while maintaining aspect ratio
          let width = 200;
          let height = (img.naturalHeight / img.naturalWidth) * width;
  
          // Update elements with actual image
          const imageElement = {
            id: placeholderElement.id,
            type: 'image',
            src: url,
            x: 100,
            y: 100,
            width,
            height,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight
          };
  
          // Replace placeholder with actual image
          updateElements(elements.map(el => 
            el.id === placeholderElement.id ? imageElement : el
          ));
          resolve();
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      });
  
      // Update the scrapbook document with metadata
      await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
        lastModified: new Date().toISOString(),
        lastModifiedBy: user.uid,
        hasImages: true // Optional: track if scrapbook contains images
      });
  
    } catch (error) {
      console.error('Error uploading image:', error);
      // Remove placeholder if upload failed
      updateElements(elements.filter(el => !el.isLoading));
      alert('Failed to upload image. Please try again.');
    }
  };

  const drawElementOnThumbnail = async (element, context, enhanceContext) => {
    return new Promise((resolve) => {
      try {
        switch (element.type) {
          case 'path':
            context.beginPath();
            context.strokeStyle = element.color || '#000000';
            context.lineWidth = (element.width || 2) * 2; // Make lines thicker
            element.points.forEach((point, index) => {
              if (index === 0) {
                context.moveTo(point.x, point.y);
              } else {
                context.lineTo(point.x, point.y);
              }
            });
            context.stroke();
            resolve();
            break;
  
          case 'image':
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = element.src;
            
            img.onload = () => {
              try {
                context.drawImage(
                  img,
                  element.x || 0,
                  element.y || 0,
                  element.width || img.width,
                  element.height || img.height
                );
                resolve();
              } catch (error) {
                console.error('Error drawing image:', error);
                resolve();
              }
            };
            
            img.onerror = () => {
              console.error('Failed to load image:', element.src);
              resolve();
            };
  
            setTimeout(() => resolve(), 5000);
            break;
  
          case 'text':
            const fontSize = element.fontSize || 16;
            context.font = `${fontSize * 1.5}px ${element.fontFamily || 'Arial'}`; // Increase text size
            context.fillStyle = element.color || '#000000';
            context.fillText(element.text || '', element.x || 0, element.y || 0);
            resolve();
            break;
  
          default:
            resolve();
            break;
        }
      } catch (error) {
        console.error('Error in drawElementOnThumbnail:', error);
        resolve();
      }
    });
  };

  
  // Helper function to handle image resize
  const getImageDimensions = (width, height, maxWidth = 200) => {
    const aspectRatio = width / height;
  
    if (width > maxWidth) {
      return {
        width: maxWidth,
        height: maxWidth / aspectRatio
      };
    }
  
    return { width, height };
  };
  
  // Optional: Add a cleanup function for unmounting
  useEffect(() => {
    return () => {
      // Clean up any abandoned uploads here if needed
      elements.forEach(element => {
        if (element.isLoading) {
          // Could delete from storage if needed
        }
      });
    };
  }, []);


//   const updateScrapbook = async () => {
//     try {
//       await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
//         elements,
//         lastModified: new Date().toISOString(),
//         lastModifiedBy: user.uid
//       });
//     } catch (error) {
//       console.error('Error updating scrapbook:', error);
//     }
//   };

const renderEraserCursor = () => {
  if (tool !== 'eraser') return null;
  return (
    <div
      className="fixed pointer-events-none border-2 border-black rounded-full"
      style={{
        width: `${eraserSize}px`,
        height: `${eraserSize}px`,
        transform: 'translate(-50%, -50%)',
        left: cursorPosition.x,
        top: cursorPosition.y,
      }}
    />
  );
};


  const [cursorPosition, setCursorPosition] = useState({x:0, y:0});

  useEffect(() => {
    const handleMouseMove = (e) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  const [title, setTitle] = useState('New Scrapbook');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Add this useEffect to load the title when component mounts
  useEffect(() => {
    const loadScrapbookTitle = async () => {
      try {
        const scrapbookDoc = await getDoc(doc(db, 'scrapbooks', scrapbookId));
        if (scrapbookDoc.exists()) {
          setTitle(scrapbookDoc.data().title);
        }
      } catch (error) {
        console.error('Error loading scrapbook title:', error);
      }
    };

    loadScrapbookTitle();
  }, [scrapbookId]);

  const handleTitleChange = async (newTitle) => {
    try {
      await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
        title: newTitle,
      });
      setTitle(newTitle);
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (CANVAS_SIZE / rect.width);
    const y = (touch.clientY - rect.top) * (CANVAS_SIZE / rect.height);

    if (tool === 'draw') {
      setIsDrawing(true);
      const newPath = {
        id: Date.now(),
        type: 'path',
        points: [{ x, y }],
        color: '#000000',
        width: 2,
      };
      setCurrentPath(newPath);
    } else if (tool === 'hand') {
      setIsPanning(true);
      setLastMousePosition({
        x: touch.clientX,
        y: touch.clientY
      });
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent scrolling while drawing
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (CANVAS_SIZE / rect.width);
    const y = (touch.clientY - rect.top) * (CANVAS_SIZE / rect.height);

    if (tool === 'draw' && isDrawing && currentPath) {
      setCurrentPath(prev => ({
        ...prev,
        points: [...prev.points, { x, y }]
      }));
    } else if (tool === 'hand' && isPanning) {
      const dx = touch.clientX - lastMousePosition.x;
      const dy = touch.clientY - lastMousePosition.y;
      setPanPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      setLastMousePosition({
        x: touch.clientX,
        y: touch.clientY
      });
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    if (tool === 'draw' && isDrawing && currentPath) {
      setIsDrawing(false);
      const updatedElements = [...elements, currentPath];
      updateElements(updatedElements);
      setCurrentPath(null);
    } else if (tool === 'hand') {
      setIsPanning(false);
    }
  };

  // Add touch event handlers for eraser
  const handleEraserTouch = (e) => {
    if (tool !== 'erase') return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (CANVAS_SIZE / rect.width);
    const y = (touch.clientY - rect.top) * (CANVAS_SIZE / rect.height);

    const updatedElements = elements.filter(element => {
      if (element.type === 'path') {
        return !element.points.some(point => 
          Math.hypot(point.x - x, point.y - y) < eraserSize/2
        );
      }
      return true;
    });

    if (updatedElements.length !== elements.length) {
      updateElements(updatedElements);
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mobile toolbar dropdown
  const MobileToolbar = () => (
    <div className="lg:hidden relative">
      {/* Move button to left side */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-20 left-4 z-50 p-2 rounded-full bg-yellow-500 text-white shadow-lg"
      >
        <FaEllipsisV size={20} />
      </button>

      {/* Move dropdown to left side */}
      {isMobileMenuOpen && (
        <div className="fixed top-32 left-4 z-50 bg-white rounded-lg shadow-xl p-4 w-64">
          {/* Title */}
          <div className="mb-4 text-center">
            {isEditingTitle ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                handleTitleChange(title);
              }}>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded"
                  autoFocus
                />
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-lg font-semibold">{title}</h2>
                {isEditable && (
                  <button onClick={() => setIsEditingTitle(true)}>
                    <FaEdit size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Drawing tools */}
          {isEditable && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setTool('select')}
                className={`p-2 rounded ${tool === 'select' ? 'bg-yellow-400' : 'bg-gray-200'}`}
              >
                Select
              </button>
              <button
                onClick={() => setTool('hand')}
                className={`p-2 rounded ${tool === 'hand' ? 'bg-yellow-500' : 'bg-gray-200'}`}
              >
                Hand
              </button>
              <button
                onClick={() => setTool('draw')}
                className={`p-2 rounded ${tool === 'draw' ? 'bg-yellow-400' : 'bg-gray-200'}`}
              >
                <FaPen />
              </button>
              <button
                onClick={() => setTool('erase')}
                className={`p-2 rounded ${tool === 'erase' ? 'bg-yellow-400' : 'bg-gray-200'}`}
              >
                <FaEraser />
              </button>
              <button
                onClick={() => setTool('text')}
                className={`p-2 rounded ${tool === 'text' ? 'bg-yellow-400' : 'bg-gray-200'}`}
              >
                <FaFont />
              </button>
              <label className="p-2 rounded bg-gray-200 flex items-center justify-center cursor-pointer">
                <FaImage />
                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            {isEditable && (
              <>
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="w-full p-2 rounded bg-gray-200 disabled:opacity-50"
                >
                  Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="w-full p-2 rounded bg-gray-200 disabled:opacity-50"
                >
                  Redo
                </button>
                <button
                  onClick={clearCanvas}
                  className="w-full p-2 rounded bg-gray-200"
                >
                  Clear
                </button>
              </>
            )}
            <button
              onClick={handleOpenComments}
              className="w-full p-2 rounded bg-gray-200 relative"
            >
              Comments
              {unreadComments > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {unreadComments}
                </span>
              )}
            </button>
          </div>

          {/* Collaborators */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-2">
              {collaborators.slice(0, 3).map((collaborator) => (
                <ProfilePicture
                  key={collaborator.email}
                  user={collaborator}
                  size="sm"
                  className="border-2 border-white"
                />
              ))}
            </div>
            {isEditable && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded bg-gray-200"
              >
                <FaCog />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-4 flex justify-between">
            <button
              onClick={handleBackToDashboard}
              className="p-2 rounded bg-blue-500 text-white"
            >
              Back
            </button>
            {isEditable && selectedElement && (
              <button
                onClick={deleteSelectedElement}
                className="p-2 rounded bg-red-500 text-white"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar - Desktop version (hidden on mobile) */}
      <div className="hidden lg:block bg-white shadow-md p-4 flex flex-col gap-4 pt-20">
        {/* Title Section */}
        <div className="flex items-center justify-center">
          {isEditingTitle ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTitleChange(title);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
                onBlur={() => handleTitleChange(title)}
              />
              <button type="submit" className="text-yellow-500 hover:text-yellow-600">
                Save
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{title}</h1>
              {isEditable && (
                <button onClick={() => setIsEditingTitle(true)} className="text-gray-500 hover:text-yellow-500">
                  <FaEdit size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Original toolbar layout */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            {isEditable && (
              <>
                <button
                  onClick={() => setTool('select')}
                  className={`p-2 rounded ${tool === 'select' ? 'bg-yellow-400' : 'bg-gray-200'}`}
                >
                  Select
                </button>
                <button
                  onClick={() => setTool('hand')}
                  className={`p-2 rounded ${tool === 'hand' ? 'bg-yellow-500' : 'bg-gray-200'}`}
                >
                  Hand Tool
                </button>
                <button
                  onClick={() => setTool('draw')}
                  className={`p-2 rounded ${tool === 'draw' ? 'bg-yellow-400' : 'bg-gray-200'}`}
                >
                  <FaPen />
                </button>
                <button
                  onClick={() => setTool('erase')}
                  className={`p-2 rounded ${tool === 'erase' ? 'bg-yellow-400' : 'bg-gray-200'}`}
                >
                  <FaEraser />
                </button>
                <button
                  onClick={() => setTool('text')}
                  className={`p-2 rounded ${tool === 'text' ? 'bg-yellow-400' : 'bg-gray-200'}`}
                >
                  <FaFont />
                </button>
                <label className="p-2 rounded bg-gray-200 cursor-pointer">
                  <FaImage />
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </label>
                <button onClick={handleUndo} className="p-2 rounded bg-gray-200" disabled={undoStack.length === 0}>
                  Undo
                </button>
                <button onClick={handleRedo} className="p-2 rounded bg-gray-200" disabled={redoStack.length === 0}>
                  Redo
                </button>
                <button onClick={clearCanvas} className="p-2 rounded bg-gray-200">
                  Clear Canvas
                </button>
              </>
            )}
            <CommentButton isOpen={isCommentsOpen} onClick={handleOpenComments} unreadCount={unreadComments} />
            <button
              onClick={handleBackToDashboard}
              className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex -space-x-2">
              {collaborators.map((collaborator, index) => (
                <ProfilePicture
                  key={index}
                  user={collaborator}
                  size="sm"
                  className="border-2 border-white"
                />
              ))}
            </div>

            {isEditable && (
              <>
                <button onClick={() => setSettingsOpen(true)} className="p-2 rounded bg-gray-200">
                  <FaCog />
                </button>
                <button
                  onClick={deleteSelectedElement}
                  disabled={!selectedElement}
                  className="p-2 rounded bg-red-500 text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile toolbar */}
      <MobileToolbar />

      {/* Canvas Container (same for both) */}
      <div className="flex-1 relative overflow-hidden touch-none">
        <div
          ref={wrapperRef}
          className="w-full h-full overflow-hidden"
          style={{ cursor: tool === 'hand' ? 'move' : 'default' }}
        >
          <div
            style={{
              transform: `translate(${panPosition.x}px, ${panPosition.y}px)`,
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
            }}
            className="relative transition-transform duration-0"
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="border border-gray-300 bg-white touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={tool === 'erase' ? handleEraserTouch : handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              style={{
                touchAction: 'none', // Prevent browser touch actions
                WebkitTouchCallout: 'none', // Disable iOS callout
                WebkitUserSelect: 'none', // Disable text selection
                userSelect: 'none'
              }}
            />
          </div>
        </div>
        {renderEraserCursor()}
      </div>

      {/* Modals (same for both) */}
      {settingsOpen && (
        <ScrapbookSettings
          scrapbookId={scrapbookId}
          onClose={() => setSettingsOpen(false)}
          collaborators={collaborators}
        />
      )}
      {isCommentsOpen && (
        <CommentSection
          scrapbookId={scrapbookId}
          user={user}
          isOpen={isCommentsOpen}
          onClose={() => setIsCommentsOpen(false)}
        />
      )}
    </div>
  );
};

export default ScrapbookEditor;