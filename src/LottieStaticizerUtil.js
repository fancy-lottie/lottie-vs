/**
 * LottieStaticizerUtil 工具函数
 */
class LottieStaticizerUtil {
  /**
   * 收集layers依赖的asset
   * @param  {Array} layers
   * @param  {Set} refIds
   */
  static collectLayerRefId(layers, refIds) {
    layers.forEach(layer => {
      if (layer.refId) {
        refIds.add(layer.refId)
      }
    })
  }
  /**
   * 收集指定id的asset依赖的底层asset
   * @param  {Array} assets
   * @param  {String} id
   * @param  {Set} baseAssetsIds
   */
  static collectAssetRefId(assets, id, baseAssetsIds) {
    const layerRefAssetIds = new Set();
    const assetIndex = assets.findIndex(item => item.id === id);

    LottieStaticizerUtil.collectLayerRefId(assets[assetIndex].layers, layerRefAssetIds);

    if (layerRefAssetIds.size === 0) { // 如果该asset没有依赖其他asset，则该asset就为底层asset
      baseAssetsIds.add(id);
    } else {
      for (const id of layerRefAssetIds.values()) {
        LottieStaticizerUtil.collectAssetRefId(assets, id, baseAssetsIds); // 对依赖的asset进行递归，找到底层asset
      }
    }
  }
  /**
   * 获取图形的位置
   * @param  {object} shape
   */
  static getShapePosition(shape) {
    const shapeItems = LottieStaticizerUtil.shapeFilter(shape);
    const shapePositions = shapeItems.filter(item => item.p).map(item => item.p.k);
    if (shapePositions.length === 1) {
      return shapePositions[0];
    } else if (shapePositions.length === 2) {
      return LottieStaticizerUtil.combinePosition(shapePositions);
    }
  }
  /**
   * 获取图层的位置
   * @param  {} layer
   */
  static getLayerPosition(layer) {
    const keyFrame = LottieStaticizerUtil.getKeyFrame(layer);
    if (!keyFrame.p.k && (keyFrame.p.x || keyFrame.p.y)) {
      const typeX = typeof keyFrame.p.x.k;
      const typeY = typeof keyFrame.p.y.k;
      if (typeX === 'number' && typeY === 'number') {
        return [keyFrame.p.x.k, keyFrame.p.y.k];
      } else if (typeX === 'number' && typeY === 'object') {
        return keyFrame.p.y.k.map(item => {
          const obj = {};
          if (item.s) obj.s = [keyFrame.p.x.k, item.s[0]];
          if (item.e) obj.e = [keyFrame.p.x.k, item.e[0]];
          if (item.t) obj.t = item.t;
          return item
        })
      } else if (typeX === 'object' && typeY === 'number') {
        return keyFrame.p.x.k.map(item => {
          const obj = {};
          if (item.s) obj.s = [item.s[0], keyFrame.p.y.k];
          if (item.e) obj.e = [item.e[0], keyFrame.p.y.k];
          if (item.t) obj.t = item.t;
          return item
        })
      } else if (typeX === 'object' && typeY === 'object') {
        return keyFrame.p.x.k.map((item, index) => {
          const obj = {};
          if (item.s) obj.s = [item.e[0], keyFrame.p.y.k[index].s[0]];
          if (item.e) obj.e = [item.e[0], keyFrame.p.y.k[index].e[0]];
          if (item.t) obj.t = item.t;
          return item
        })
      }
    } else {
      return keyFrame.p.k;
    }
  }
  /**
   * 获取图层关键帧
   * @param  {} layer
   */
  static getKeyFrame(layer) {
    return layer.ks;
  }
  /**
   * 获取图层关键帧-锚点
   * @param  {} layer
   */
  static getAnchorPoint(layer) {
    const keyFrame = LottieStaticizerUtil.getKeyFrame(layer);
    return keyFrame.a;
  }
  /**
   * 获取图层关键帧-缩放
   * @param  {} layer
   */
  static getScale(layer) {
    const keyFrame = LottieStaticizerUtil.getKeyFrame(layer);
    return keyFrame.s;
  }
  /**
   * 获取图层关键帧-透明度
   * @param  {} layer
   */
  static getOpacity(layer) {
    const keyFrame = LottieStaticizerUtil.getKeyFrame(layer);
    return keyFrame.o;
  }
  /**
   * 获取图层关键帧-旋转
   * @param  {} layer
   */
  static getRotation(layer) {
    const keyFrame = LottieStaticizerUtil.getKeyFrame(layer);
    return keyFrame.r;
  }
  /**
   * 判断是否有Repeater
   * @param  {} layer
   */
  static hasRepeater(layer) {
    if (layer && layer.shapes) {
      return layer.shapes.some(shape => shape.ty === 'rp')
    }
    return false;
  }
  /**
   * 判断是否有Rotation变化
   * @param  {} layer
   */
  static hasRotation(layer) {
    let hasRotation = false;
    const keyFrame = LottieStaticizerUtil.getKeyFrame(layer);
    if (keyFrame.r && keyFrame.r.k) hasRotation = true;
    return hasRotation;
  }
  /**
   * 判断是否有position变化
   * @param  {} layer
   */
  static hasPositionChange(layer) {
    const layerPosition = LottieStaticizerUtil.getLayerPosition(layer);
    let isLayerPositionChange = layerPosition.some(k => typeof k === 'object');
    let isShapePositionChange = false;
    // 不一定存在shape
    if (layer.shapes) {
      const shapePosition = LottieStaticizerUtil.getShapePosition(layer.shapes[0]);
      if (shapePosition) {
        isShapePositionChange = shapePosition.some(k => typeof k === 'object');
      }
    }
    return isLayerPositionChange || isShapePositionChange
  }
  /**
   * 判断是否有形变、色变
   * @param  {} layer
   */
  static hasTransformOrColorChange(layer) {
    // Todo: 确认形变、色变在layer上的表现 ==> shape存在形变时不应该执行静态化
    const keyFrame = LottieStaticizerUtil.getKeyFrame(layer);
    let shapeTransform = false;
    let layerTransform = false;
    if (layer.shapes) {
      shapeTransform = layer.shapes.some(shape => {
        return LottieStaticizerUtil.didShapeTransform(shape);
      })

    }
    if (keyFrame.s) {
      const ks = keyFrame.s.k;
      layerTransform = ks.some(val => val.i);
    }
    return shapeTransform || layerTransform;
  }
  /**
   * 判断一个layer是否可以被静态化
   * @param  {} layer
   */
  static layerShouldStaticize(layer) {
    return layer.ty === 4 && !LottieStaticizerUtil.hasRepeater(layer) && !LottieStaticizerUtil.hasTransformOrColorChange(layer) && !(LottieStaticizerUtil.hasRotation(layer) && LottieStaticizerUtil.hasPositionChange(layer));
  }

  /**
   * 返回ty为rc、tr、el、sh的shapeItem
   * @param  {obj} shape
   */
  static shapeFilter(shape) {
    if (shape && Array.isArray(shape.it)) {
      return shape.it.filter(shapeItem => ['rc', 'tr', 'el', 'sh'].includes(shapeItem.ty));
    }
    return [];
  }

  /**
   * @param  {} it
   */
  static didShapeSHTransform(it) {
    const keyFrame = LottieStaticizerUtil.getKeyFrame(it);
    if (keyFrame.k.length > 1) return true;
  }

  /**
   * @param  {} it
   */
  static didShapeSTTransform(it) {
    if (it.o.k.length > 1) return true;
  }

  /**
   * @param  {} it
   */
  static didShapeFLTransform(it) {
    if (it.c.k.length > 1 || it.o.k.length > 1) return true
  }

  /**
   * @param  {} it
   */
  static didShapeTRTransform(it) {
    if ((it.s.k.length > 1 && typeof it.s.k[0] === 'object') || it.r.k.length > 1) return true;
  }

  /**
   * @param  {} it
   */
  static didShapeTMTransform(it) {
    if (it.s.k.length > 1 || it.e.k.length > 1) return true;
  }

  /**
   * 判断shape是否存在形变(目前路径可以出现变化、描边可以变化、填充可以变化、剪裁)
   */
  static didShapeTransform(shape) {
    if (!shape) return false;
    if (Array.isArray(shape.it)) {
      return shape.it.some(shapeItem => {
        if (shapeItem.ty === 'sh') {
          return LottieStaticizerUtil.didShapeSHTransform(shapeItem);
        }
        if (shapeItem.ty === 'st') {
          return LottieStaticizerUtil.didShapeSTTransform(shapeItem);
        }
        // if (shapeItem.ty === 'fl') {
        //   return LottieStaticizerUtil.didShapeFLTransform(shapeItem)
        // }
        if (shapeItem.ty === 'tr' && shape.it.length > 1) {
          return LottieStaticizerUtil.didShapeTRTransform(shapeItem);
        }
        if (shapeItem.ty === 'tm') {
          return LottieStaticizerUtil.didShapeTMTransform(shapeItem);
        }
        return false;
      })
    } else if (shape.ty) {
      if (shape.ty === 'tm') {
        return LottieStaticizerUtil.didShapeTMTransform(shape);
      }
    }
  }

  /**
   * 抽取直接定义在layer中的矢量图形
   * @param  {} json
   */
  static extractBaseLayers(json) {
    return json.layers.filter(layer => LottieStaticizerUtil.layerShouldStaticize(layer));
  }

  /**
    * 抽取被依赖的最底层asset
    * @param  {JSON} json
    * @returns {Array} baseAssets
  */
  static extractBaseAssets(json) {
    const layers = json.layers || []; // json.layers
    const assets = json.assets || []; // json.assets
    const layersRefIds = new Set();  // json.layers依赖的assets
    const baseAssetsIds = new Set(); // 最底层的assets ids
    const baseAssets = []; // 最底层的assets

    if (layers.length) {
      LottieStaticizerUtil.collectLayerRefId(layers, layersRefIds);
    }

    if (assets.length && layersRefIds.size) {
      for (const id of layersRefIds.values()) {
        LottieStaticizerUtil.collectAssetRefId(assets, id, baseAssetsIds)
      }
    }
    for (const baseAssetId of baseAssetsIds) {
      baseAssets.push(...assets.filter(item => item.id === baseAssetId).map(item => ({
        ...item,
        id: baseAssetId
      })));
    }
    return baseAssets.map(item => ({
      ...json,
      ...item,
      assets: [],
    }))
  }
  /**
* 合并位置信息
* @param  {} positions
*/
  static combinePosition(positions) {
    const basePosition = positions[0];
    const secondPosition = positions[1];
    let resultPosition = [];
    let flag = -1;
    let basePositionType = '';
    let secondPositionType = '';
    if (Array.isArray(basePosition) && Array.isArray(secondPosition)) {
      if (typeof basePosition[0] === 'object') {
        resultPosition = basePosition;
        flag = 1;
        basePositionType = 'object';
      } else {
        basePositionType = 'number';
      }
      if (typeof secondPosition[0] === 'object') {
        if (flag === -1) {
          resultPosition = secondPosition;
          flag = 2;
        }
        secondPositionType = 'object';
      } else {
        secondPositionType = 'number';
      }
      if (flag === -1) {
        resultPosition = basePosition.map((item, index) => item + secondPosition[index]);
      }
      if (flag === 1) {
        if (secondPositionType === 'number') {
          resultPosition = resultPosition.map(item => {
            if (item.s) {
              item.s = item.s.map((val, idx) => val + secondPosition[idx]);
            }
            if (item.e) {
              item.e = item.e.map((val, idx) => val + secondPosition[idx]);
            }
            return item
          })
        } else {
          console.log('两个object合并稍等')
        }
      }
      if (flag === 2) {
        if (basePositionType === 'number') {
          resultPosition = resultPosition.map(item => {
            if (item.s) {
              item.s = item.s.map((val, idx) => val + basePosition[idx]);
            }
            if (item.e) {
              item.e = item.e.map((val, idx) => val + basePosition[idx]);
            }
            return item
          })
        } else {
          console.log('两个object合并稍等')
        }
      }
      return resultPosition;
    }
  }
  /**
  * 将矢量图形layer关键帧调整到最适合导出状态
  * @param  {Object} asset
  */
  static convertLayerKeyFrame(asset) {
    const ksTypes = ['o', 'r', 'p', 'a', 's']
    if (Array.isArray(asset.layers)) {
      asset.layers.forEach(layer => {
        const ks = layer.ks;
        ksTypes.forEach(type => {
          switch (type) {
            case 'o':
              if (Array.isArray(ks[type].k)) {
                ks[type].k = ks[type].k.map(item => ({
                  ...item,
                  s: [100],
                  e: [100]
                }))
              }
              break;
            case 'r':
              if (ks[type]) {
                if (Array.isArray(ks[type].k)) {
                  ks[type].k = ks[type].k.map(item => {
                    if (typeof item === 'object') {
                      return {
                        ...item,
                        s: [0],
                        e: [0]
                      }
                    } else {
                      return item
                    }
                  })
                } else {
                  ks[type].k = 0;
                }
              }
              break;
            case 's':
              if (Array.isArray(ks[type].k)) {
                ks[type].k = ks[type].k.map(item => {
                  if (typeof item === 'object') {
                    return {
                      ...item,
                      s: [100, 100, 100],
                      e: [100, 100, 100]
                    }
                  } else {
                    return item
                  }
                })
              }
              break;
            default:
              break;
          }
        })
      })
    }
  }
  /**
  * 计算矢量图形静态化为图片后的坐标
  */
  static computeImgPosition(layer) {
    const layerPosition = LottieStaticizerUtil.getLayerPosition(layer);
    const shapePosition = LottieStaticizerUtil.getShapePosition(layer.shapes[0]);
    const resultPosition = LottieStaticizerUtil.combinePosition([layerPosition, shapePosition]);
    return resultPosition;
  }
}

export default LottieStaticizerUtil;