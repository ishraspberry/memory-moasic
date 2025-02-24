export const generateColorFromString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB',
    '#E67E22', '#1ABC9C', '#F1C40F', '#7F8C8D'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}; 
