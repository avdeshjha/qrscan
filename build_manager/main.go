package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"regexp"

	"github.com/Jeffail/gabs"
	"github.com/otiai10/copy"
)

//Widget config.xml/widget
type Widget struct {
	ID   string `xml:"id,attr"`
	Name Name
}

//Name config.xml/wigdet/name
type Name struct {
	Value string `xml:",innerxml"`
}

func main() {
	//filenames
	configFilename := "../config.xml"
	packageFilename := "../package.json"
	modelFilename := "../src/app/services/model.service.ts"
	resourcesDirname := "../resources"

	//read desired config from user
	fmt.Println("Enter desired settings filename...")
	var settingsPath string
	fmt.Scanln(&settingsPath)

	settingsFile, err := os.Open(settingsPath)
	if err != nil {
		panic(err)
	}
	defer settingsFile.Close()
	settingsBytes, _ := ioutil.ReadAll(settingsFile)
	settings, _ := gabs.ParseJSON(settingsBytes)

	fmt.Printf("\nLoading values from config: %s...\n\n", settings.Path("name").Data())

	//FOLDERS
	//read resource src
	resourceSrc := fmt.Sprintf("%v", settings.Path("folders.resources").Data())

	//delete old resources
	os.RemoveAll(resourcesDirname)

	//copy new resources
	cerr := copy.Copy("../"+resourceSrc, resourcesDirname)
	if cerr != nil {
		panic(err)
	}

	fmt.Println("Updated resources dir")

	//XML
	//config.xml
	configFile, _ := ioutil.ReadFile(configFilename)
	newConfigContents := string(configFile)

	//read and set id
	widgetR,_ := regexp.Compile("(<widget ).*(>)")
	id := fmt.Sprintf("%v", settings.Path("xml.configxml.widget._id").Data())
	newWidget := "<widget xmlns=\"http://www.w3.org/ns/widgets\" xmlns:cdv=\"http://cordova.apache.org/ns/1.0\" id=\"" + id + "\" version=\"0.1.4\">"
	newConfigContents = widgetR.ReplaceAllString(newConfigContents, newWidget)

	//read and set name
	nameR,_ := regexp.Compile("(<name>).*(</name>)")
	name := fmt.Sprintf("%v", settings.Path("xml.configxml.widget.name").Data())
	newName := "<name>" + name + "</name>"
	newConfigContents = nameR.ReplaceAllString(newConfigContents, newName)

	//read and set description
	descR,_ := regexp.Compile("(<description>).*(</description>)")
	desc := fmt.Sprintf("%v", settings.Path("xml.configxml.widget.description").Data())
	newDesc := "<description>" + desc + "</description>"
	newConfigContents = descR.ReplaceAllString(newConfigContents, newDesc)

	//read and set plugin info - APP_ID
	appIDR,_ := regexp.Compile("<variable name=\"APP_ID\" value=\".*\" />")
	appID := fmt.Sprintf("%v", settings.Path("json.packagejson.cordova.plugins.cordova-plugin-ionic.APP_ID").Data())
	newAppID := "<variable name=\"APP_ID\" value=\"" + appID + "\" />"
	newConfigContents = appIDR.ReplaceAllString(newConfigContents, newAppID)

	//read and set plugin info - CHANNEL_NAME
	channelNameR,_ := regexp.Compile("<variable name=\"CHANNEL_NAME\" value=\".*\" />")
	channelName := fmt.Sprintf("%v", settings.Path("json.packagejson.cordova.plugins.cordova-plugin-ionic.CHANNEL_NAME").Data())
	newChannelName := "<variable name=\"CHANNEL_NAME\" value=\"" + channelName + "\" />"
	newConfigContents = channelNameR.ReplaceAllString(newConfigContents, newChannelName)

	//read and set plugin info - UPDATE_METHOD
	updateMethodR,_ := regexp.Compile("<variable name=\"UPDATE_METHOD\" value=\".*\" />")
	updateMethod := fmt.Sprintf("%v", settings.Path("json.packagejson.cordova.plugins.cordova-plugin-ionic.UPDATE_METHOD").Data())
	newUpdateMethod := "<variable name=\"UPDATE_METHOD\" value=\"" + updateMethod + "\" />"
	newConfigContents = updateMethodR.ReplaceAllString(newConfigContents, newUpdateMethod)

	//write config.xml
	_ = ioutil.WriteFile(configFilename, []byte(newConfigContents), 0644)

	fmt.Println("Updated config.xml")

	//JSON
	//package.json
	pkgFile, err := os.Open(packageFilename)
	defer pkgFile.Close()
	pkgBytes, _ := ioutil.ReadAll(pkgFile)
	pkgJSON, err := gabs.ParseJSON(pkgBytes)

	//read and set name
	pkgJSON.Set(settings.Path("json.packagejson.name").Data(), "name")

	//read and set desc
	pkgJSON.Set(settings.Path("json.packagejson.description").Data(), "description")

	//read and set app_id
	pkgJSON.SetP(settings.Path("json.packagejson.cordova.plugins.cordova-plugin-ionic.APP_ID").Data(),
		"cordova.plugins.cordova-plugin-ionic.APP_ID")

	//read and set channel_name
	pkgJSON.SetP(settings.Path("json.packagejson.cordova.plugins.cordova-plugin-ionic.CHANNEL_NAME").Data(),
		"cordova.plugins.cordova-plugin-ionic.CHANNEL_NAME")

	//read and set update_method
	pkgJSON.SetP(settings.Path("json.packagejson.cordova.plugins.cordova-plugin-ionic.UPDATE_METHOD").Data(),
		"cordova.plugins.cordova-plugin-ionic.UPDATE_METHOD")

	//write package.json
	pkgOut := pkgJSON.StringIndent("", "  ")
	_ = ioutil.WriteFile(packageFilename, []byte(pkgOut), 0644)

	fmt.Println("Updated package.json")

	//TS
	//model.service.ts
	modelFile, _ := ioutil.ReadFile(modelFilename)
	newContents := string(modelFile)

	//read and set value
	if settings.Path("ts.modelservicets.sfa").Data() == true {
		newContents = strings.Replace(string(modelFile), "public sfa: boolean = false;", "public sfa: boolean = true;", -1)
	} else {
		newContents = strings.Replace(string(modelFile), "public sfa: boolean = true;", "public sfa: boolean = false;", -1)
	}

	//write model.service.ts
	_ = ioutil.WriteFile(modelFilename, []byte(newContents), 0644)

	fmt.Println("Updated model.service.ts")

	fmt.Println("\nAll settings applied!")

}
