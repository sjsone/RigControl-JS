const { RigControl } = require('./rigControl')

const rigControl = new RigControl();

// rigControl.debug = true


; (async () => {

    // Uncomment initSerial to connect to SerialPort
    // rigControl.initSerial()
    await rigControl.sendInitializeInInterfaceCommand()
    await rigControl.sendTurnCommand(1)
    await rigControl.sendTurnCommand(-1)
    await rigControl.sendTurnCommand(0)

    // await rigControl.sendTurnToCommand(21.7, 3)
})()





