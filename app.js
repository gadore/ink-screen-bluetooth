const noble = require('@abandonware/noble');
const { createCanvas, Image } = require('canvas')
const dayjs = require('dayjs');
const spawn = require('child_process').spawn
const os = require('os')
const fs = require('fs')
const http = require('http')
const url = require('url')

let visitor = '0'
let tempature = '0'
let CPU = '0'
let Memory = '0'
let Nas = 'Unknown'
let datas = new Array()
let poweredOn = false
let currentDevice = null

const WIDTH = 296, HEIGHT = 128
const BLACK_VALUE = 255
const BLACK = 0
const WHITE = 1
const RED = 2
const writeWithResponse = false
const canvas = createCanvas(WIDTH, HEIGHT)
const ctx = canvas.getContext('2d')

const log = (msg) => { console.log(msg) }
const onBluetoothStateChange = (state) => {
      if (state === 'poweredOn') {
            log('poweredOn')
            poweredOn = true
      }
      if (state === 'poweredOff') {
            poweredOn = false
            stopScanning()
      }
}
const startCommand = () => {
      const command = Buffer.alloc(5)
      command[0] = 0x13
      return command
}
const fourF_Command = () => {
      const command = Buffer.alloc(5, 0xff)
      command[0] = 0x13
      return command
}
const four0_Command = () => {
      const command = Buffer.alloc(5, 0x00)
      command[0] = 0x12
      return command
}
const finalCommand = () => {
      const command = Buffer.alloc(4, 0x01)
      command[0] = 0x50
      command[1] = 0x00
      return command
}
const generateSendCommand = (screenData, screenData1) => {
      datas.length = 0
      datas.push(startCommand())

      let index = 1
      while (screenData.length > 0) {
            if (screenData.length > 180) {
                  const command = Buffer.alloc(184)
                  command[0] = 0x13
                  command[1] = index
                  command[2] = 0xb4
                  let sum = 0
                  for (let i = 3; i < 183; i++) {
                        let tempNum = screenData.shift()
                        command[i] = tempNum
                        sum += tempNum
                  }
                  command[183] = sum % 256
                  datas.push(command)
                  index++
            } else {
                  const command = Buffer.alloc(4 + screenData.length)
                  command[0] = 0x13
                  command[1] = index
                  command[2] = screenData.length
                  let sum = 0
                  for (let i = 3; i < (screenData.length + 3); i++) {
                        let tempNum = screenData.shift()
                        command[i] = tempNum
                        sum += tempNum
                  }
                  command[3 + screenData.length] = sum % 256
                  datas.push(command)
                  index++
                  if (screenData.length === 28) { screenData.length = 0 }
            }
      }
      datas.push(fourF_Command())
      datas.push(four0_Command())

      index = 1
      while (screenData1.length > 0) {
            if (screenData1.length > 180) {
                  const command = Buffer.alloc(184)
                  command[0] = 0x12
                  command[1] = index
                  command[2] = 0xb4
                  let sum = 0
                  for (let i = 3; i < 183; i++) {
                        let tempNum = screenData1.shift()
                        command[i] = tempNum
                        sum += tempNum
                  }
                  command[183] = sum % 256
                  datas.push(command)
                  index++
            } else {
                  const command = Buffer.alloc(4 + screenData1.length)
                  command[0] = 0x12
                  command[1] = index
                  command[2] = screenData1.length
                  let sum = 0
                  for (let i = 3; i < (screenData1.length + 3); i++) {
                        let tempNum = screenData1.shift()
                        command[i] = tempNum
                        sum += tempNum
                  }
                  command[3 + screenData1.length] = sum % 256
                  datas.push(command)
                  index++
                  if (index === 28) { screenData1.length = 0 }
            }
      }
      datas.push(fourF_Command())
      datas.push(finalCommand())
}
const sendData = (characteristic) => {
      if (datas.length > 0) {
            const msg = datas.shift()
            if (msg) {
                  let result = new Uint16Array(msg)
                  log('[Message write]: ' + result.toString())
                  characteristic.write(msg, writeWithResponse, () => {
                        sendData(characteristic)
                  })
            }
      } else {
            log('send completed')
            currentDevice?.disconnect()
      }
}

const onCharacteristicFound = (_error, services, _characteristics) => {
      const characteristic = services[0].characteristics[0]
      characteristic.once('notify', (state) => { log('notify: ' + state) });
      characteristic.once('write', () => { }, (res) => { log('write get response: ' + res) })
      setTimeout(() => {
            sendData(characteristic)
      }, 250)
}

const onDescover = (peripheral) => {
      log('searning...')
      if (peripheral.connectable === true && peripheral.state === 'disconnected') {
            if (peripheral.advertisement.localName === 'EPD-000EDA61') {
                  stopScanning()
                  currentDevice = peripheral
                  peripheral.once('connect', () => {
                        log('Connected !!! ')
                        peripheral.discoverSomeServicesAndCharacteristics(['ffe0'], ['ffe2'], onCharacteristicFound);
                  });
                  peripheral.once('disconnect', () => {
                        log('disconnected !!! ')
                  });
                  peripheral.connect()
            }
      }
}

noble.on('discover', (peripheral) => { onDescover(peripheral) });

noble.on('warning', (msg) => { log('noble warning: ' + msg) })

const startScan = () => {
      if (poweredOn === false) { return }
      noble.startScanningAsync([], false, (error) => {
            log('start scanning error:' + error)
            stopScanning()
      });
}

const stopScanning = () => { noble.stopScanningAsync() }

noble.on('stateChange', (state) => { onBluetoothStateChange(state) });

const calcColorBlack = (r, g, b, a) => {
      if (r > BLACK_VALUE / 3 && g <= BLACK_VALUE / 3 && b <= BLACK_VALUE / 3) { return RED }
      if (r > BLACK_VALUE / 3 && g > BLACK_VALUE / 3 && b > BLACK_VALUE / 3 && a > BLACK_VALUE / 3) { return BLACK }
      return WHITE
}

const drawCanvasByData = () => {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, WIDTH / 2, HEIGHT / 2)

      ctx.font = '22px Arial'
      ctx.fillStyle = 'black'
      ctx.fillText(visitor, 5, 24)

      ctx.font = '24px Arial'
      ctx.fillStyle = 'black'
      ctx.fillText('Nas:', 20, 50)
      ctx.fillText('CpuPi:', 20, 100)
      ctx.fillText('MemPi:', 20, 75)

      ctx.font = '16px Arial'
      ctx.fillText(dayjs(dayjs()).format('YYYY-MM-DD HH:mm:ss'), 20, 123)

      ctx.font = '24px Arial'
      ctx.fillStyle = 'red'
      ctx.fillRect(5, 110, 7, 14);

      ctx.fillText(Nas, 75, 50)
      ctx.fillText(CPU + '% @' + tempature + '°', 100, 100)
      ctx.fillText(Memory, 105, 75)
      //ctx.fillText(visitor, 175, 26)

      const data = ctx.getImageData(0, 0, WIDTH, HEIGHT).data

      const screenData = new Array()
      let rowData = new Array()
      const tempArray = new Array()
      let index = 0
      for (let i = 0; i < data.length; i++) {
            tempArray.push(data[i])
            if (tempArray.length < 4) { continue }
            rowData.push(calcColorBlack(tempArray[0], tempArray[1], tempArray[2], tempArray[3]))
            if (rowData.length === WIDTH) {
                  screenData[index++] = rowData.slice()
                  rowData.length = 0
            }
            tempArray.length = 0
      }
      const result = new Array()
      const result1 = new Array()
      for (let j = 0; j < WIDTH; j++) {
            for (let k = 0; k < HEIGHT; k++) {
                  if (screenData[k] != undefined && screenData[k][j] !== undefined) {
                        if (screenData[k][j] === RED) {
                              result1.push(WHITE)
                              result.push(BLACK)
                        } else {
                              result.push(screenData[k][j] === WHITE ? BLACK : WHITE)
                              result1.push(BLACK)
                        }
                  } else {
                        log('not found:' + k + ', ' + j)
                  }
            }
      }
      const finalValue = new Array()
      const finalValue1 = new Array()
      let tempStr = ''
      let tempStr1 = ''
      for (let l = 0; l < result.length; l++) {
            tempStr += result[l]
            tempStr1 += result1[l]
            if (tempStr.length < 8) { continue }
            finalValue.push(parseInt(tempStr, 2))
            finalValue1.push(parseInt(tempStr1, 2))
            tempStr = ''
            tempStr1 = ''
      }
      launchBluetoothUpdate(finalValue, finalValue1)
}

const launchBluetoothUpdate = (screenData, screenData1) => {
      generateSendCommand(screenData, screenData1)
      setTimeout(() => { startScan() }, 1000)
}

const fetchAllDatas = () => {
      const temp = spawn('cat', ['/sys/class/thermal/thermal_zone0/temp'])
      temp.stdout.on('data', function (data) { tempature = parseInt(data / 1000).toString() })

      CPU = parseInt(os.loadavg()[0] * 100 / 3).toString()

      const available = 1024 * Number(/MemAvailable:[ ]+(\d+)/.exec(fs.readFileSync('/proc/meminfo', 'utf8'))[1])
      Memory = Math.round((os.totalmem() - available) / 1024 / 1024) + 'M/' + Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'G'
}

const loadImage = () => {
      fetchAllDatas()
      const img = new Image()
      img.onload = () => {
            ctx.drawImage(img, 0, 0, WIDTH, HEIGHT)
            drawCanvasByData()
      }
      img.onerror = err => { throw err }
      img.src = 'swim.jpg'
}

const server = http.createServer((req, res) => {
      let path = url.parse(req.url, true)
      try {

            if (req.method === 'OPTIONS') {
                  var headers = {};
                  headers["Access-Control-Allow-Origin"] = "*";
                  headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
                  headers["Access-Control-Allow-Credentials"] = false;
                  headers["Access-Control-Max-Age"] = '86400';
                  headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
                  res.writeHead(200, headers);
                  res.end();
            } else {
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Engaged-Auth-Token");
                  switch (path.pathname) {
                        case '/':
                        case '/notify':
                              let params = path.query
                              if (params.visitor) {
                                    visitor = params.visitor
                                    serverStatus = 'Running'
                                    loadImage()
                              }
                              res.writeHead(200)
                              res.write('success')
                              res.end()
                              break
                        case '/nas':
                              let param = path.query
                              if (param.CPU !== undefined && param.Memory && param.Disk) {
                                    Nas = param.CPU + '% ' + param.Memory
                                    visitor = param.Disk
                                    loadImage()
                              }
                              res.writeHead(200)
                              res.write('200')
                              res.end()
                              break
                        default:
                              res.writeHead(404)
                              res.write('404')
                              res.end()
                              break
                  }
            }
      } catch (err) {
            console.log(err)
            Logger.getInstance().logError('App.js', 'Server handle router :' + pathName + ' error' + err)
            res.writeHead(404)
            res.write('404')
            res.end()
      }
})

server.listen(8080)
fetchAllDatas()
