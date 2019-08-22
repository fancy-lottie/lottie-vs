/**
 * @param  {number} deg 角度
 */
function getCosDeg(deg) {
 const rad = deg * Math.PI / 180;
 return Math.cos(rad);
}

/**
 * @param  {number} deg 角度
 */
function getSinDeg(deg) {
  const rad = deg * Math.PI/180;
  return Math.sin(rad);
}

/**
 * 根据canvas画板的像素信息计算出图片有效区域（删除空白区域）
 * @param  {Object} canvas
 */
function computeImgSqure(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, width, height); // 获取整个画板信息
  const data = imageData.data;
  let leftOffset = width, rightOffset = 0, topOffset = height, bottomOffset = 0;

  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      let pos = (j * width + i) * 4;
      if (data[pos] > 0 || data[pos + 1] > 0 || data[pos + 2] > 0 || data[pos + 3] > 0) {
        bottomOffset = Math.max(j, bottomOffset);
        rightOffset = Math.max(i, rightOffset);
        topOffset = Math.min(j, topOffset);
        leftOffset = Math.min(i, leftOffset);
      }
    }
  }

  bottomOffset++;
  rightOffset++;
  return {
    leftOffset,
    rightOffset,
    topOffset,
    bottomOffset
  };
}
/**
 * 深拷贝json对象
 * @param {*} json 
 */
function deepCopy(json) {
  return JSON.parse(JSON.stringify(json));
}
export {
  getCosDeg,
  getSinDeg,
  computeImgSqure,
  deepCopy
}