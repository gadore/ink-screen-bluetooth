const { createCanvas } = require('canvas')

const WIDTH = 296, HEIGHT = 152
const canvas = createCanvas(WIDTH, HEIGHT)
const ctx = canvas.getContext('2d')

const TOP_H = Math.floor(HEIGHT / 4)        // 38
const MID_H = Math.floor(HEIGHT / 2)        // 76
const BOT_H = HEIGHT - TOP_H - MID_H        // 38

async function fetchGoldData() {
      try {
            const res = await fetch('https://www.huilvbiao.com/api/gold_autd_real')
            const data = await res.json().catch(() => null)
            if (!Array.isArray(data)) return []
            return data.slice(0, 7).map(item => {
                  const open = Number(item.open)
                  const dt = String(item.date_time || '')
                  let hour = ''
                  if (dt.includes(' ')) hour = (dt.split(' ')[1] || '').slice(0,2)
                  return { open, hour }
            }).filter(d => Number.isFinite(d.open))
      } catch (e) {
            console.error('fetch error', e)
            return []
      }
}

function formatNow() {
      const d = new Date()
      const pad = n => (n<10? '0'+n : ''+n)
      return `${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function drawLayout(goldList) {
      ctx.clearRect(0,0,WIDTH,HEIGHT)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0,0,WIDTH,HEIGHT)

      // 顶部更新时间
      ctx.fillStyle = '#000'
      ctx.font = '22px Arial'
      ctx.textBaseline = 'middle'
      ctx.fillText(`Update at: ${formatNow()}`, 6, TOP_H/2)

      // 中部金价：左小字 + 右大数字
      const latest = goldList[0]?.open
      const priceStr = Number.isFinite(latest) ? latest.toFixed(2) : '--'
      ctx.textBaseline = 'middle'
      const midCenterY = TOP_H + MID_H/2
      const label = 'GOLD: '
      ctx.font = '24px Arial'
      ctx.fillStyle = '#000'
      ctx.fillText(label, 6, midCenterY)
      const labelW = ctx.measureText(label).width
      // 动态确定右侧数字字体大小，避免超出画布
      let bigFontSize = 56
      const maxRight = WIDTH - 6
      while (bigFontSize > 24) {
            ctx.font = bigFontSize + 'px Arial'
            const numW = ctx.measureText(priceStr).width
            if (6 + labelW + numW <= maxRight) break
            bigFontSize -= 2
      }
      ctx.font = bigFontSize + 'px Arial'
      ctx.fillText(priceStr, 6 + labelW, midCenterY)

      // 底部柱状图
      drawBars(goldList)
}

function drawBars(goldList) {
      if (!goldList.length) return
      const areaY = TOP_H + MID_H
      const areaH = BOT_H
      const marginX = 6
      const marginTopLabel = 10   // 金额文字区高度
      const marginBottomLabel = 12 // 小时文字区高度
      const innerTopY = areaY + marginTopLabel
      const innerBottomY = areaY + areaH - marginBottomLabel
      const usableH = innerBottomY - innerTopY

      // 使用时间顺序：最新在右侧 -> 反转
      const list = goldList.slice(0,7).reverse()
      const values = list.map(i=>i.open)
      const minV = Math.min(...values)
      const maxV = Math.max(...values)
      const range = maxV - minV || 1

      const totalWidth = WIDTH - marginX*2
      const gap = 6
      const barWidth = Math.floor((totalWidth - gap*(list.length-1)) / list.length)
      let x = marginX
      ctx.fillStyle = '#000'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1

      list.forEach(item => {
            const norm = (item.open - minV) / range
            const h = Math.max(2, Math.round(norm * usableH))
            const barBottom = innerBottomY
            const barTop = barBottom - h
            // 框出柱体
            ctx.fillRect(x, barTop, barWidth, h)

            // 顶部金额
            ctx.font = '12px Arial'
            ctx.textBaseline = 'alphabetic'
            const priceTxt = item.open.toFixed(1)
            const pw = ctx.measureText(priceTxt).width
            const ptX = x + (barWidth - pw)/2
            let ptY = barTop - 2
            if (ptY < areaY + 8) ptY = areaY + 8 // 不顶到区域边缘
            ctx.fillText(priceTxt, ptX, ptY)

            // 底部小时
            ctx.font = '12px Arial'
            ctx.textBaseline = 'alphabetic'
            const hourTxt = item.hour || ''
            const hw = ctx.measureText(hourTxt).width
            const hx = x + (barWidth - hw)/2
            const hy = areaY + areaH - 2
            ctx.fillText(hourTxt, hx, hy)

            x += barWidth + gap
      })
}

function canvasToBase64() {
      return canvas.toBuffer('image/png').toString('base64')
}

async function main() {
      const goldList = await fetchGoldData()
      drawLayout(goldList)
      const b64 = canvasToBase64()
      try {
            const resp = await fetch('https://dot.mindreset.tech/api/open/image', {
                  method: 'POST',
                  headers: {
                        'Authorization': 'Bearer ' + 'TOKEN_HERE',
                        'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ refreshNow: true, deviceId: 'DEVICE_ID_HERE', image: b64, border: 0, ditherType: 'NONE' })
            })
            const json = await resp.json().catch(()=>null)
            console.log('sent', json)
      } catch (e) {
            console.error('post error', e)
      }
}

if (require.main === module) { main() }
