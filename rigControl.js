const { SerialPort } = require('serialport')



class RigControl {

    static COMMAND_INIT = 0x01
    static COMMAND_TURN_TO = 0x10
    static COMMAND_TURN = 0x11

    constructor() {
        this.packageCounter = 0x01
        this.debug = false
        this.serialInitialized = false
    }

    initSerial() {
        this.serial = new SerialPort('/dev/ttyUSB0', {
            baudRate: 115200,
            databits: 8,
            parity: 'none'
        }, (error) => {
            throw error
        });
        this.serialInitialized = true
    }

    /**
     * @param {number} cmdId 
     * @param {undefined|Uint8Array} payload 
     * @param {boolean} debug 
     */
    sendCommand(cmdId, payload = undefined) {
        const commandLength = 1 + 1 + 1 + (payload !== undefined ? payload.length : 0) // id + counter + numberOfPayload + payload.length
        const command = new Uint8Array(commandLength)
        if (this.debug) console.log(" [sendCommand] Sending command")

        command[0] = cmdId
        if (this.debug) console.log(" [sendCommand] Appended packageCounter", this.packageCounter)
        command[1] = this.packageCounter++
        if (this.debug) console.log(" [sendCommand] next packageCounter will be", this.packageCounter)

        command[2] = payload.length

        if (payload !== undefined) {
            for (let i = 0; i < payload.length; i++) {
                if (this.debug) console.log(` [sendCommand]   Added payload ${payload[i]} to command`)
                command[i + 3] = payload[i]
            }
        }

        if (this.debug) console.log(" [sendCommand] Added payload of length", (payload !== undefined ? payload.length : undefined), "with value", payload)

        const checksum = this.calculateChecksum(command)
        if (this.debug) console.log(" [sendCommand] checksum", checksum, "for", command)

        const commandWithChecksum = new Uint8Array([...command, checksum])

        // this.arduino.write(command)
        this.write(commandWithChecksum)
    }

    sendInitializeInInterfaceCommand() {
        this.sendCommand(RigControl.COMMAND_INIT, new Uint8Array([0x00, 0x00]))
    }

    /**
     * @param {number} targetDegree 
     * @param {number} speedInDegreePerSecond 
     */
    sendTurnToCommand(targetDegree, speedInDegreePerSecond) {
        if (typeof targetDegree !== "number") throw Error("targetDegree has to be an integer or float")
        if (typeof speedInDegreePerSecond !== "number") throw Error("speedInDegreePerSecond has to be an integer")
        if (targetDegree > 180 || targetDegree < -180) throw Error("targetDegree cannot be greater than 180 or less than -180 but is ", targetDegree)
        if (speedInDegreePerSecond > 255 || speedInDegreePerSecond < 1) throw Error("speedInDegreePerSecond has to be between 1 and 255 but is ", speedInDegreePerSecond)

        const degreeValue = Math.round(targetDegree * 10) // needs to be between 1800 or -1800

        if (this.debug) console.log("Degree Value", degreeValue)

        const degreeValueBytes = this.convertDegreeValueIntoHighLowBytes(degreeValue)
        const speedByte = (new Uint8Array([speedInDegreePerSecond]))[0]

        this.sendCommand(RigControl.COMMAND_TURN_TO, new Uint8Array([...degreeValueBytes, speedByte]))
    }

    sendTurnCommand(speedInDegreePerSecond) {
        if (typeof speedInDegreePerSecond !== "number") throw Error("speedInDegreePerSecond has to be an integer or float")

        const speedInDegreePerSecondBytes = this.convertDegreeValueIntoHighLowBytes(speedInDegreePerSecond)
        this.sendCommand(RigControl.COMMAND_TURN, speedInDegreePerSecondBytes)
    }

    convertDegreeValueIntoHighLowBytes(degreeValue) {
        const byteValue = (new Uint16Array([degreeValue]))[0]
        return new Uint8Array([(byteValue >> 8) & 0xff, byteValue & 0xff])
    }

    /**
    * @param {Uint8Array} command 
     */
    calculateChecksum(command) {
        return command.reduce((a, b) => a ^ b, 0x00)
    }


    write(data) {
        if (!this.serialInitialized) {
            console.log("would send: ", [...data].map(n => '0x' + (n.toString(16).padStart(2, '0'))).join(', '))
            return
        }
        return new Promise((resolve, reject) => {
            this.serial.write(data, (err, result) => {
                if (err) {
                    reject(err)
                }
                resolve(result)
            });
        })
    }
}

module.exports = {
    RigControl
}