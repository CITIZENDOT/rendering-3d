/* eslint-disable react/prop-types */
import prettyBytes from 'pretty-bytes'
import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Col, Container, Dropdown, FloatingLabel, Form, ListGroup, Row } from 'react-bootstrap'
import {
  BoxGeometry,
  GLSL3,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  ShaderChunk,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { useFilePicker } from 'use-file-picker'

import './App.css'

const vertexShader = `${ShaderChunk.common}
${ShaderChunk.logdepthbuf_pars_vertex}
uniform vec2 size;
out vec2 vUv;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vUv = uv;
    ${ShaderChunk.logdepthbuf_vertex}
}`
const fragmentShader = `${ShaderChunk.logdepthbuf_pars_fragment}
precision highp sampler2DArray;
uniform sampler2DArray diffuse;
in vec2 vUv;
uniform int depth;
out vec4 outColor;

void main() {
    vec4 color = texture2D( diffuse, vec3( vUv, depth ) );
    outColor = LinearTosRGB(color);
    ${ShaderChunk.logdepthbuf_fragment}
}`

function getBufferCopy(buffer) {
  const bufferCopy = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(bufferCopy).set(new Uint8Array(buffer))
  return bufferCopy
}

function getTruncatedText(text, maxLength) {
  if (text.length > maxLength) {
    return text.substring(0, maxLength - 3) + '...'
  }
  return text
}

function GeometryComponent({ scale, setScale, setGeometry }) {
  const [errors, setErrors] = useState([])

  const [openFileSelector, { filesContent }] = useFilePicker({
    readAs: 'ArrayBuffer',
    multiple: false
  })

  const [loaderType, setLoaderType] = useState('')

  useEffect(() => {
    if (!loaderType || !filesContent.length) return
    const bufferCopy = getBufferCopy(filesContent[0].content)
    if (loaderType == 'OBJLoader') {
      const loader = new OBJLoader()
      const text = new TextDecoder('utf-8').decode(bufferCopy)
      const object = loader.parse(text)
      object.traverse(function (o) {
        console.log(o)
        if (o.isMesh) {
          setErrors([])
          setGeometry(o.geometry)
        }
      })
    } else if (loaderType == 'DRACOLoader') {
      const loader = new DRACOLoader()
      loader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.3/')
      loader.preload()
      loader.parse(
        bufferCopy,
        (_geometry) => {
          setErrors([])
          setGeometry(_geometry)
        },
        (e) => {
          console.error(e)
          setErrors([...errors, e.error])
        }
      )
      loader.dispose()
    }
  }, [loaderType, filesContent])

  return (
    <Card>
      <Card.Body>
        <Card.Title> Geometry </Card.Title>

        <Row xs={1} sm={1} md={2}>
          <Col className="my-1">
            <Dropdown onSelect={(key) => setLoaderType(key)} className="d-inline">
              <Dropdown.Toggle>{loaderType ? loaderType : 'Select Loader'}</Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item eventKey="OBJLoader">OBJLoader</Dropdown.Item>
                <Dropdown.Item eventKey="DRACOLoader">DRACOLoader</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
          <Col className="my-1">
            <Button onClick={() => openFileSelector()} title={filesContent.length ? filesContent[0].name : undefined}>
              {' '}
              {filesContent.length ? getTruncatedText(filesContent[0].name, 20) : 'Upload Geometry file'}{' '}
            </Button>
          </Col>
          <Col className="m-1">
            <FloatingLabel label="Scale">
              <Form.Control
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                type="number"
                placeholder="Scale"
                style={{ width: '75px' }}
              />
            </FloatingLabel>
          </Col>
        </Row>
      </Card.Body>
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
    </Card>
  )
}

function TextureComponent({ renderer, material, setMaterial }) {
  const [depth, setDepth] = useState(0)
  const [errors, setErrors] = useState([])
  const [mipmapSize, setMipmapSize] = useState(0)
  const [transcodingTime, setTranscodingTime] = useState(0)

  const [openFileSelector, { filesContent }] = useFilePicker({
    readAs: 'ArrayBuffer',
    multiple: false
  })

  const [loaderType, setLoaderType] = useState('')

  useEffect(() => {
    if (!loaderType || !filesContent.length) return
    const bufferCopy = getBufferCopy(filesContent[0].content)

    if (loaderType == 'ImageLoader') {
      const texture = new Texture()
      const imageBlob = new Blob([bufferCopy])
      const image = new Image()
      image.src = URL.createObjectURL(imageBlob)
      image.onload = function () {
        texture.image = image
        texture.colorSpace = SRGBColorSpace
        texture.needsUpdate = true
        setMipmapSize(0)
        setErrors([])
        setMaterial(new MeshBasicMaterial({ map: texture }))
      }
    } else if (loaderType == 'KTX2Loader') {
      const loader = new KTX2Loader()
      loader.setTranscoderPath('https://unpkg.com/three@0.153.0/examples/jsm/libs/basis/')
      loader.detectSupport(renderer)

      const getTexture = async () => {
        const startTime = Date.now()
        const texture = await loader._createTexture(bufferCopy)
        const finishTime = Date.now()
        setTranscodingTime(finishTime - startTime)
        texture.colorSpace = SRGBColorSpace
        texture.needsUpdate = true
        setMipmapSize(texture.mipmaps[0].data.length)
        setErrors([])
        setMaterial(new MeshBasicMaterial({ map: texture }))
      }

      getTexture().catch((err) => {
        console.error(err)
        setErrors([...errors, err.message])
      })
      loader.dispose()
    } else if (loaderType == 'KTX2LoaderVideo') {
      const loader = new KTX2Loader()
      loader.setTranscoderPath('https://unpkg.com/three@0.153.0/examples/jsm/libs/basis/')
      loader.detectSupport(renderer)

      const getTexture = async () => {
        const startTime = Date.now()
        const texture = await loader._createTexture(bufferCopy)
        const finishTime = Date.now()
        setTranscodingTime(finishTime - startTime)
        setMipmapSize(texture.mipmaps[0].data.length)
        texture.colorSpace = SRGBColorSpace
        texture.needsUpdate = true
        const material = new ShaderMaterial({
          uniforms: {
            diffuse: {
              value: texture
            },
            depth: {
              value: depth
            }
          },
          vertexShader: vertexShader,
          fragmentShader: fragmentShader,
          glslVersion: GLSL3
        })
        material.needsUpdate = true
        setErrors([])
        setMaterial(material)
      }

      getTexture().catch((err) => {
        console.error(err)
        setErrors([...errors, err.message])
      })
      loader.dispose()
    }
  }, [loaderType, filesContent])

  useEffect(() => {
    if (loaderType == 'KTX2LoaderVideo' && material && material.isShaderMaterial) {
      material.uniforms.depth.value = depth
      material.needsUpdate = true
      setMaterial(material)
    }
  }, [depth])

  return (
    <Card>
      <Card.Body>
        <Card.Title>Texture</Card.Title>

        <Row xs={1} sm={1} md={1} lg={3}>
          <Col className="m-1">
            <Dropdown onSelect={(key) => setLoaderType(key)} className="d-inline">
              <Dropdown.Toggle>{loaderType ? loaderType : 'Select Loader'}</Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item eventKey="ImageLoader">ImageLoader</Dropdown.Item>
                <Dropdown.Item eventKey="KTX2Loader">KTX2Loader</Dropdown.Item>
                <Dropdown.Item eventKey="KTX2LoaderVideo">KTX2 Video Textures</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
          <Col className="m-1">
            <Button onClick={() => openFileSelector()} title={filesContent.length ? filesContent[0].name : undefined}>
              {' '}
              {filesContent.length ? getTruncatedText(filesContent[0].name, 20) : 'Upload Texture file'}
            </Button>
          </Col>
          <Col className="m-1">
            {loaderType == 'KTX2LoaderVideo' ? (
              <FloatingLabel label="Depth">
                <Form.Control
                  value={depth}
                  onChange={(e) => setDepth(parseInt(e.target.value))}
                  type="number"
                  placeholder="Depth for KTX2 Video Textures"
                  style={{ width: '75px' }}
                />
              </FloatingLabel>
            ) : null}
          </Col>
        </Row>
      </Card.Body>
      {mipmapSize && transcodingTime ? (
        <Alert variant="info" className="m-2">
          <Alert.Heading>Transcoding details</Alert.Heading>
          <ListGroup>
            <ListGroup.Item variant="info">Mipmap Size: {prettyBytes(mipmapSize)}</ListGroup.Item>
            <ListGroup.Item variant="info">Transcoding time: {`${transcodingTime} ms`}</ListGroup.Item>
          </ListGroup>
        </Alert>
      ) : null}
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
    </Card>
  )
}

function App() {
  const [geometry, setGeometry] = useState(new BoxGeometry(1, 1, 1))
  const [material, setMaterial] = useState(new MeshBasicMaterial({ color: 0x00ffff }))
  const [scale, setScale] = useState(1)

  const mesh = new Mesh()

  const mountRef = useRef(null)
  const scene = new Scene()
  const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  const renderer = new WebGLRenderer()
  renderer.outputColorSpace = SRGBColorSpace
  const controls = new OrbitControls(camera, renderer.domElement)

  useEffect(() => {
    renderer.setSize(window.innerWidth * 0.5, window.innerHeight * 0.5)
    mountRef.current.appendChild(renderer.domElement)

    mesh.geometry = geometry
    mesh.material = material
    mesh.geometry.attributes.position.needsUpdate = true
    mesh.material.needsUpdate = true
    mesh.scale.setScalar(scale)

    scene.add(mesh)
    camera.position.z = 1.5
    controls.update()

    var animate = function () {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }

    const onWindowResize = function () {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth * 0.5, window.innerHeight * 0.5)
    }

    window.addEventListener('resize', onWindowResize, false)

    animate()

    return () => mountRef.current.removeChild(renderer.domElement)
  }, [geometry, material, scale])

  return (
    <Container fluid>
      <Row className="m-2">
        <h1
          style={{
            textAlign: 'center'
          }}
        >
          3D test bench
        </h1>
        <a href="measure-ktx2">
          <h4
            style={{
              textAlign: 'center'
            }}
          >
            Measure KTX2 transcoding times here
          </h4>
        </a>
        <Col>
          <GeometryComponent scale={scale} setScale={setScale} setGeometry={setGeometry} />
        </Col>
        <Col>
          <TextureComponent material={material} renderer={renderer} setMaterial={setMaterial} />
        </Col>
      </Row>
      <Row ref={mountRef}></Row>
    </Container>
  )
}

export default App
