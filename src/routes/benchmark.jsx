import prettyBytes from 'pretty-bytes'
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Container, FloatingLabel, Form, ListGroup, Row, Table } from 'react-bootstrap'
import stats from 'stats-lite'
import { WebGLRenderer } from 'three'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader'
import { useFilePicker } from 'use-file-picker'
import { getBufferCopy } from '../utils'

function round2(n) {
  return Math.round(n * 100) / 100
}

export default function Benchmark() {
  const [errors, setErrors] = useState([])

  const [isSynchronous, setIsSynchronous] = useState(false)

  const [userData, setUserData] = useState({
    frameCount: 7 /* in a single file */,
    frameRate: 25
  })

  const [computedStats, setComputedStats] = useState({
    computed: false,
    transcodingTime: 0,
    playTime: 0,
    transcodingDeviation: 0,
    fileSize: 0,
    fileSizeDeviation: 0,
    requiredFetchSpeed: 0,
    totalTranscodingTime: 0,
    totalFileSize: 0,
    totalPlayTime: 0,
  })

  useEffect(() => {
    if (!computedStats.computed) return

    if (isSynchronous) {
      const playTime = 1000 * (userData.frameCount / userData.frameRate) // in milliseconds
      const maxFetchTime = (playTime - computedStats.transcodingTime) / 1000 // in seconds
      const minimumSpeed = computedStats.fileSize / maxFetchTime
      setComputedStats({
        ...computedStats,
        playTime: playTime,
        requiredFetchSpeed: minimumSpeed
      })
    } else {
      const totalPlayTime = (state.length * userData.frameCount * 1000) / userData.frameRate // milliseconds
      const totalFetchTime = (totalPlayTime - computedStats.totalTranscodingTime) / 1000 // seconds
      const requiredFetchSpeed = computedStats.totalFileSize / totalFetchTime
      setComputedStats({
        ...computedStats,
        totalPlayTime: totalPlayTime,
        requiredFetchSpeed: requiredFetchSpeed
      })
    }

  }, [userData])

  const [openFileSelector, { filesContent }] = useFilePicker({
    readAs: 'ArrayBuffer',
    multiple: true
  })

  const [state, setState] = useState([])
  /*
    {
      name: string,
      size: number,
      mipmapSize: number,
      transcodingTime: number
    }
   */

  useEffect(() => {
    if (!filesContent.length) return
    setComputedStats({
      ...computedStats,
      computed: false,
    })

    const newState = []
    filesContent.forEach((el) => {
      newState.push({
        name: el.name,
        size: el.content.byteLength,
        mipmapSize: 0,
        transcodingTime: 0
      })
    })
    setState(newState)

    const renderer = new WebGLRenderer()
    const loader = new KTX2Loader()
    loader.setTranscoderPath('https://unpkg.com/three@0.153.0/examples/jsm/libs/basis/')
    loader.detectSupport(renderer)

    const bufferCopies = []
    filesContent.forEach((value) => {
      bufferCopies.push(getBufferCopy(value.content))
    })

    if (isSynchronous) {
      const updateData = async (index) => {
        if (index == filesContent.length) {
          /**
           * We reached end of the array.
           * Calculate statistics now.
           */
          const transcodingTimes = newState.map((el) => el.transcodingTime)
          const avgTranscodingTime = stats.mean(transcodingTimes) // in milliseconds
          const transcodingDev = stats.stdev(transcodingTimes)
          const fileSizes = newState.map((el) => el.size)
          const avgFileSize = stats.mean(fileSizes)
          const fileSizeDev = stats.stdev(avgFileSize)
          const playTime = 1000 * (userData.frameCount / userData.frameRate) // in milliseconds
          const maxFetchTime = (playTime - avgTranscodingTime) / 1000 // in seconds
          const minimumSpeed = avgFileSize / maxFetchTime
          setComputedStats({
            ...computedStats,
            computed: true,
            transcodingTime: avgTranscodingTime,
            transcodingDeviation: isNaN(transcodingDev) ? 0 : (transcodingDev / avgTranscodingTime) * 100,
            fileSize: avgFileSize,
            playTime: playTime,
            fileSizeDeviation: isNaN(fileSizeDev) ? 0 : round2((fileSizeDev / avgFileSize) * 100),
            requiredFetchSpeed: minimumSpeed
          })
          return
        }
        const startTime = Date.now()
        try {
          const texture = await loader._createTexture(bufferCopies[index])
          const finishTime = Date.now()
          newState[index].mipmapSize = prettyBytes(texture.mipmaps[0].data.length)
          newState[index].transcodingTime = finishTime - startTime
          setState([...newState])
          updateData(index + 1)
        } catch (err) {
          console.error(err)
          setErrors([...errors, err.message])
        }
      }
      updateData(0)
    } else {
      const updateData = async (index) => {
        const texture = await loader._createTexture(bufferCopies[index])
        newState[index].mipmapSize = prettyBytes(texture.mipmaps[0].data.length)
        setState([...newState])
      }

      const promises = []

      const startTime = Date.now()
      for (let i = 0; i < newState.length; i++) {
        promises.push(updateData(i))
      }

      Promise.all(promises)
        .then(() => {
          const finishTime = Date.now()

          const totalTranscodingTime = finishTime - startTime // milliseconds
          const totalPlayTime = (newState.length * userData.frameCount * 1000) / userData.frameRate // milliseconds
          const totalFetchTime = (totalPlayTime - totalTranscodingTime) / 1000 // seconds
          const totalFileSize = newState.reduce((prevSum, current) => prevSum + current.size, 0)
          const requiredFetchSpeed = totalFileSize / totalFetchTime

          setComputedStats({
            ...computedStats,
            computed: true,
            totalTranscodingTime: totalTranscodingTime,
            totalFileSize: totalFileSize,
            totalPlayTime: totalPlayTime,
            requiredFetchSpeed: requiredFetchSpeed
          })
        })
    }



    loader.dispose()
  }, [filesContent, isSynchronous])

  return (
    <Container>
      <Row className="m-2">
        <Col>
          <Card className="m-2">
            <Card.Body>
              <Card.Title>Measure KTX2 transcoding time</Card.Title>
              <Card.Subtitle>
                Also calculates estimated internet speed required to play UVOL2 without buffering
              </Card.Subtitle>

              <Row xs={1} sm={2}>
                <Col>
                  <Button className="m-2" onClick={() => openFileSelector()}>
                    Upload KTX2 files (multiple files allowed)
                  </Button>
                </Col>
                <Col>
                  <Form.Check // prettier-ignore
                    type="switch"
                    inline
                    label="Synchronous"
                    className='m-2'
                    value={isSynchronous}
                    onChange={() => setIsSynchronous(!isSynchronous)}
                  />
                </Col>
              </Row>

              <Row>
                <Col>
                  <FloatingLabel label="FrameCount">
                    <Form.Control
                      value={userData.frameCount}
                      onChange={(e) => setUserData({ ...userData, frameCount: parseInt(e.target.value) })}
                      type="number"
                      placeholder="FrameCount"
                    />
                  </FloatingLabel>
                </Col>
                <Col>
                  <FloatingLabel label="FrameRate">
                    <Form.Control
                      value={userData.frameRate}
                      onChange={(e) => setUserData({ ...userData, frameRate: parseInt(e.target.value) })}
                      type="number"
                      placeholder="FrameRate"
                      min={1}
                    />
                  </FloatingLabel>
                </Col>
              </Row>

              <Row className="mt-2">
                <Col>
                  {computedStats.computed ? (
                    isSynchronous ? (<Alert variant="info">
                      <Alert.Heading>Computed Stats</Alert.Heading>
                      <ListGroup>
                        <ListGroup.Item variant={computedStats.transcodingTime < computedStats.playTime ? "info" : "danger"}>
                          Average Transcoding Time (per file): <b>{`${round2(computedStats.transcodingTime)} ms`}</b>
                        </ListGroup.Item>
                        <ListGroup.Item variant="info">
                          Average Time to play a texture file: <b>{`${round2(computedStats.playTime)} ms`}</b>
                        </ListGroup.Item>
                        <ListGroup.Item variant="info">
                          Deviation in Transcoding time: <b>{`${round2(computedStats.transcodingDeviation)} %`}</b>
                        </ListGroup.Item>
                        <ListGroup.Item variant="info">
                          Average File size: <b>{prettyBytes(Math.ceil(computedStats.fileSize))}</b>
                        </ListGroup.Item>
                        <ListGroup.Item variant="info">
                          Deviation in File size: <b>{`${round2(computedStats.fileSizeDeviation)} %`}</b>
                        </ListGroup.Item>
                        <ListGroup.Item variant={computedStats.requiredFetchSpeed > 0 ? 'info' : 'danger'}>
                          Minimum Internet Speed required to play UVOL using these textures:{' '}
                          <b>{prettyBytes(computedStats.requiredFetchSpeed) + '/sec'}</b>
                        </ListGroup.Item>
                      </ListGroup>
                    </Alert>) : (
                      <Alert variant="info">
                        <Alert.Heading>Computed Stats</Alert.Heading>
                        <ListGroup>
                          <ListGroup.Item variant={computedStats.totalTranscodingTime < computedStats.totalPlayTime ? "info" : "danger"}>
                            Total Transcoding time: <b>{`${round2(computedStats.totalTranscodingTime)} ms`}</b>
                          </ListGroup.Item>
                          <ListGroup.Item variant="info">
                            Total Play time: <b>{`${round2(computedStats.totalPlayTime)} ms`}</b>
                          </ListGroup.Item>
                          <ListGroup.Item variant="info">
                            Total Files size: <b>{prettyBytes(Math.ceil(computedStats.totalFileSize))}</b>
                          </ListGroup.Item>
                          <ListGroup.Item variant={computedStats.requiredFetchSpeed > 0 ? 'info' : 'danger'}>
                            Minimum Internet Speed required to play UVOL using these textures:{' '}
                            <b>{prettyBytes(computedStats.requiredFetchSpeed) + '/sec'}</b>
                          </ListGroup.Item>
                        </ListGroup>
                      </Alert>
                    )
                  ) : null}
                </Col>
              </Row>

              {errors.length ? (
                <Alert variant="danger" className="m-2">
                  <Alert.Heading>Errors</Alert.Heading>
                  {errors.length > 1 ? (
                    <ListGroup>
                      {errors.map((el, index) => {
                        return (
                          <ListGroup.Item variant="danger" key={index}>
                            {el}
                          </ListGroup.Item>
                        )
                      })}
                    </ListGroup>
                  ) : (
                    errors[0]
                  )}
                </Alert>
              ) : null}

              {state.length ? (
                <Table>
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>File Size</th>
                      <th>Mipmaps Size</th>
                      {isSynchronous ? <th>Transcoding Time</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {state.map((row, index) => {
                      return (
                        <tr key={index}>
                          <td>{row.name}</td>
                          <td>{prettyBytes(row.size)}</td>
                          <td>{row.mipmapSize ? row.mipmapSize : 'Loading...'}</td>
                          {isSynchronous ? <td>{row.transcodingTime ? `${row.transcodingTime} ms` : 'Loading...'}</td> : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              ) : null}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
