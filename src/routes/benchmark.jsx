import prettyBytes from 'pretty-bytes'
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Container, FloatingLabel, Form, ListGroup, Row, Table } from 'react-bootstrap'
import stats from 'stats-lite'
import { WebGLRenderer } from 'three'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader'
import { useFilePicker } from 'use-file-picker'

function round2(n) {
  return Math.round(n * 100) / 100
}

export default function ErrorPage() {
  const [errors, setErrors] = useState([])

  const [userData, setUserData] = useState({
    frameCount: 7 /* in a single file */,
    frameRate: 25
  })

  const [computedStats, setComputedStats] = useState({
    computed: false,
    transcodingTime: '',
    transcodingDeviation: '',
    fileSize: '',
    fileSizeDeviation: '',
    requiredFetchSpeed: ''
  })

  const [openFileSelector, { filesContent }] = useFilePicker({
    readAs: 'ArrayBuffer',
    multiple: true
  })

  const [state, setState] = useState([])
  /*
    {
      name: string,
      size: string,
      mipmapSize: string,
      transcodingTime: number
    }
   */

  useEffect(() => {
    if (!filesContent.length) return

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
          computed: true,
          transcodingTime: `${round2(avgTranscodingTime)} ms`,
          transcodingDeviation: isNaN(transcodingDev) ? 0 : `${round2((transcodingDev / avgTranscodingTime) * 100)} %`,
          fileSize: prettyBytes(Math.ceil(avgFileSize)),
          fileSizeDeviation: isNaN(fileSizeDev) ? 0 : `${round2((fileSizeDev / avgFileSize) * 100)} %`,
          requiredFetchSpeed: prettyBytes(minimumSpeed) + '/sec'
        })
        return
      }
      const startTime = Date.now()
      try {
        const texture = await loader._createTexture(filesContent[index].content)
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

    loader.dispose()
  }, [filesContent])

  useEffect(() => {
    console.log(computedStats)
  }, [computedStats])

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
              <Button className="m-2" onClick={() => openFileSelector()}>
                Upload KTX2 files (multiple files allowed)
              </Button>

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
                    />
                  </FloatingLabel>
                </Col>
              </Row>

              <Row className="mt-2">
                <Col>
                  {computedStats.computed ? (
                    <Alert variant="info">
                      <Alert.Heading>Computed Stats</Alert.Heading>
                      <ListGroup>
                        <ListGroup.Item variant="info">
                          Average Transcoding Time: <b>{computedStats.transcodingTime}</b>
                        </ListGroup.Item>
                        <ListGroup.Item variant="info">
                          Deviation in Transcoding time: <b>{computedStats.transcodingDeviation}</b>
                        </ListGroup.Item>
                        <ListGroup.Item variant="info">
                          Average File size: <b>{computedStats.fileSize}</b>
                        </ListGroup.Item>
                        <ListGroup.Item variant="info">
                          Deviation in File size: <b>{computedStats.fileSizeDeviation}</b>
                        </ListGroup.Item>
                        <ListGroup.Item variant="info">
                          Minimum Internet Speed required to play UVOL using these textures:{' '}
                          <b>{computedStats.requiredFetchSpeed}</b>
                        </ListGroup.Item>
                      </ListGroup>
                    </Alert>
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
                      <th>Transcoding Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.map((row, index) => {
                      return (
                        <tr key={index}>
                          <td>{row.name}</td>
                          <td>{prettyBytes(row.size)}</td>
                          <td>{row.mipmapSize ? row.mipmapSize : 'Loading...'}</td>
                          <td>{row.transcodingTime ? `${row.transcodingTime} ms` : 'Loading...'}</td>
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
