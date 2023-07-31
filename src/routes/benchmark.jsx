import prettyBytes from 'pretty-bytes'
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Container, FloatingLabel, Form, ListGroup, Row, Table } from 'react-bootstrap'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { WebGLRenderer } from 'three'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader'
import { useFilePicker } from 'use-file-picker'

import { getBufferCopy } from '../utils'

export default function VRAMBenchmark() {
  const [openFileSelector, { filesContent }] = useFilePicker({
    readAs: 'ArrayBuffer',
    multiple: true
  })

  const [resolution, setResolution] = useState([])

  const [userData, setUserData] = useState({
    frameCount: 7 /* in a single file */
  })
  const [errors, setErrors] = useState([])

  const [state, setState] = useState([])
  /**
   {
    name: string,
    ktx2VRAM: number
    mp4VRAM: number
   }
   */

  useEffect(() => {
    if (!resolution.length || !state.length) return
    const newState = [...state]
    for (let i = 0; i < newState.length; i++) {
      newState[i].mp4VRAM = (resolution[0] * resolution[1] * userData.frameCount * 4) / (1024 * 1024)
    }
    setState(newState)
  }, [userData])

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filesContent.length) return
    setLoading(true)

    const newState = []
    filesContent.forEach((el) => {
      newState.push({
        name: el.name,
        ktx2VRAM: 0,
        mp4VRAM: 0
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

    const updateData = async (index) => {
      const texture = await loader._createTexture(bufferCopies[index])
      if (!resolution.length) {
        setResolution([texture.mipmaps[0].width, texture.mipmaps[0].height])
      }
      newState[index].ktx2VRAM = texture.mipmaps[0].data.length / (1024 * 1024)
      newState[index].mp4VRAM =
        (userData.frameCount * texture.mipmaps[0].width * texture.mipmaps[0].height * 4) / (1024 * 1024) // 32 bytes for RGBA => 4 bytes
      texture.dispose()
      setState([...newState])
    }

    const promises = []

    for (let i = 0; i < newState.length; i++) {
      promises.push(updateData(i))
    }

    Promise.all(promises).then(() => {
      console.log(newState)
      setState(newState)
      setLoading(false)
    })

    loader.dispose()
  }, [filesContent])

  return (
    <Container>
      <Row className="m-2">
        <Col>
          <Card className="m-2">
            <Card.Body>
              <Card.Title>Measure KTX2 vs Equivalent MP4 VRAM usage</Card.Title>

              <Row xs={1} sm={2}>
                <Col>
                  <Button className="m-2" onClick={() => openFileSelector()}>
                    Upload KTX2 files (multiple files preferred)
                  </Button>
                </Col>
              </Row>

              <Row>
                <Col>
                  <FloatingLabel label="FrameCount in each texture file">
                    <Form.Control
                      value={userData.frameCount}
                      onChange={(e) => setUserData({ ...userData, frameCount: parseInt(e.target.value) })}
                      type="number"
                      placeholder="FrameCount"
                    />
                  </FloatingLabel>
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

              <Row className='m-3'>
                <Col>
                  {state.length && !loading ? (
                    <ResponsiveContainer width="80%" height={400}>
                      <BarChart
                        width={500}
                        height={300}
                        data={state}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <YAxis unit="  MB" />
                        <Tooltip labelFormatter={(index) => state[index].name} />
                        <Legend />
                        <Bar dataKey="ktx2VRAM" fill="#8884d8" name="VRAM usage by KTX2" />
                        <Bar dataKey="mp4VRAM" fill="#82ca9d" name="VRAM usage by MP4" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : null}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
